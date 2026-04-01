const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

function fallbackEstimate(mealText) {
  const text = String(mealText || "").toLowerCase();
  let calories = 350;
  let protein = 20;
  if (/(chicken|beef|steak|tuna|salmon|egg|protein shake|whey)/.test(text)) protein += 18;
  if (/(rice|pasta|bread|burger|pizza|fries|chips)/.test(text)) calories += 220;
  if (/(salad|veg|vegetable|fruit|apple|banana)/.test(text)) calories -= 80;
  calories = Math.max(80, Math.min(2200, Math.round(calories)));
  protein = Math.max(3, Math.min(120, Math.round(protein)));
  return { calories, protein, source: "fallback" };
}

function extractJsonFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    const block = raw.match(/\{[\s\S]*\}/);
    if (!block) return null;
    try {
      return JSON.parse(block[0]);
    } catch (_err2) {
      return null;
    }
  }
}

exports.estimateMealNutrition = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    secrets: [GEMINI_API_KEY]
  },
  async (request) => {
    const meal = String(request?.data?.meal || "").trim();
    if (!meal) {
      throw new HttpsError("invalid-argument", "Meal text is required.");
    }

    // Require signed-in user for abuse protection.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in is required.");
    }

    const fallback = fallbackEstimate(meal);
    let apiKey = "";
    try {
      apiKey = GEMINI_API_KEY.value();
    } catch (error) {
      logger.error(
        "Failed to access GEMINI_API_KEY from Secret Manager. Using fallback estimate.",
        error
      );
      return fallback;
    }
    if (!apiKey) {
      logger.warn("GEMINI_API_KEY is not configured. Using fallback estimate.");
      return fallback;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = [
        "Estimate nutrition for the following meal description.",
        "Return JSON only with keys calories and protein (grams).",
        "No markdown and no extra keys.",
        `Meal: ${meal}`
      ].join("\n");
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.() || "";
      const parsed = extractJsonFromText(text);
      const calories = Math.max(0, Math.round(Number(parsed?.calories || 0)));
      const protein = Math.max(0, Math.round(Number(parsed?.protein || 0)));
      if (!calories && !protein) return fallback;
      return { calories, protein, source: "ai" };
    } catch (error) {
      logger.error("estimateMealNutrition failed, using fallback", error);
      return fallback;
    }
  }
);
