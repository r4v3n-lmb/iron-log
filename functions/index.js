const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const USER_ROLES = new Set(["user", "coach", "admin"]);
const DEFAULT_FLAGS = {
  enableSocialFeed: true,
  enableCoachMode: true,
  enableReferrals: true,
  enableShareCards: true,
  enableWebhooks: true,
  enableRecurringPlans: true,
  enablePushNotifications: true,
  enablePublicProfiles: true,
  enableExerciseCatalogAdmin: true
};

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", error);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
});

function assertAuth(request) {
  const uid = request?.auth?.uid || "";
  if (!uid) throw new HttpsError("unauthenticated", "Sign in is required.");
  return uid;
}

function roleFromToken(request) {
  const token = request?.auth?.token || {};
  if (token?.admin === true) return "admin";
  if (typeof token?.role === "string") return token.role.toLowerCase();
  return "user";
}

function assertRole(request, allowedRoles) {
  const role = roleFromToken(request);
  if (!allowedRoles.includes(role)) {
    throw new HttpsError("permission-denied", "Insufficient role.");
  }
  return role;
}

async function assertPremiumEntitlement(request, featureName = "this feature") {
  const uid = assertAuth(request);
  const role = roleFromToken(request);
  if (role === "admin") return { uid, role, premium: true };
  const userSnap = await db.collection("users").doc(uid).get();
  const premium = userSnap.exists && userSnap.get("premium") === true;
  if (!premium) {
    throw new HttpsError("failed-precondition", `Premium access is required for ${featureName}.`);
  }
  return { uid, role, premium };
}

function asText(value, fallback = "", maxLen = 500) {
  const s = String(value ?? fallback).trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function asPositiveInt(value, fallback = 0, max = 1000000) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, Math.round(n));
}

function minuteBucket(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
}

async function enforceRateLimit(uid, key, maxRequestsPerMinute = 30) {
  const bucket = minuteBucket();
  const docId = `${uid}_${key}_${bucket}`;
  const ref = db.collection("rate_limits").doc(docId);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const count = asPositiveInt(snap.get("count"), 0, 100000) + 1;
    if (count > maxRequestsPerMinute) {
      throw new HttpsError("resource-exhausted", "Too many requests. Try again shortly.");
    }
    txn.set(
      ref,
      {
        uid,
        key,
        bucket,
        count,
        updatedAt: FieldValue.serverTimestamp(),
        expireAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000))
      },
      { merge: true }
    );
  });
}

async function writeAuditLog(uid, action, payload = {}, status = "ok") {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const entry = {
    uid: asText(uid, "system", 128),
    action: asText(action, "unknown", 120),
    status: asText(status, "ok", 32),
    payload: safePayload,
    createdAt: FieldValue.serverTimestamp()
  };
  await db.collection("audit_logs").add(entry);
}

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

exports.health = onRequest({ region: "us-central1" }, async (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "ironlog-functions",
    now: new Date().toISOString()
  });
});

exports.estimateMealNutrition = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
    secrets: [GEMINI_API_KEY]
  },
  async (request) => {
    const uid = assertAuth(request);
    await enforceRateLimit(uid, "estimate_meal", 20);

    const meal = asText(request?.data?.meal, "", 500);
    if (!meal) throw new HttpsError("invalid-argument", "Meal text is required.");

    const fallback = fallbackEstimate(meal);
    let apiKey = "";
    try {
      apiKey = GEMINI_API_KEY.value();
    } catch (error) {
      logger.error("Secret read failed for GEMINI_API_KEY", error);
      await writeAuditLog(uid, "estimateMealNutrition", { source: "fallback_secret_error" }, "fallback");
      return fallback;
    }

    if (!apiKey) {
      await writeAuditLog(uid, "estimateMealNutrition", { source: "fallback_missing_key" }, "fallback");
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
      if (!calories && !protein) {
        await writeAuditLog(uid, "estimateMealNutrition", { source: "fallback_empty_response" }, "fallback");
        return fallback;
      }
      await writeAuditLog(uid, "estimateMealNutrition", { source: "ai" }, "ok");
      return { calories, protein, source: "ai" };
    } catch (error) {
      logger.error("estimateMealNutrition failed, using fallback", error);
      await writeAuditLog(uid, "estimateMealNutrition", { source: "fallback_error" }, "fallback");
      return fallback;
    }
  }
);

exports.setUserRole = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const actorUid = assertAuth(request);
  assertRole(request, ["admin"]);
  await enforceRateLimit(actorUid, "set_role", 15);

  const targetUid = asText(request?.data?.uid, "", 128);
  const nextRole = asText(request?.data?.role, "", 32).toLowerCase();
  if (!targetUid || !USER_ROLES.has(nextRole)) {
    throw new HttpsError("invalid-argument", "uid and valid role are required.");
  }

  await admin.auth().setCustomUserClaims(targetUid, { role: nextRole, admin: nextRole === "admin" });
  await db.collection("users").doc(targetUid).set(
    {
      role: nextRole,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid
    },
    { merge: true }
  );
  await writeAuditLog(actorUid, "setUserRole", { targetUid, nextRole });
  return { ok: true, uid: targetUid, role: nextRole };
});

exports.setUserPremiumEntitlement = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const actorUid = assertAuth(request);
  assertRole(request, ["admin"]);
  await enforceRateLimit(actorUid, "set_user_premium", 30);

  const targetUid = asText(request?.data?.uid, "", 128);
  const premium = !!request?.data?.premium;
  if (!targetUid) throw new HttpsError("invalid-argument", "uid is required.");

  await db.collection("users").doc(targetUid).set(
    {
      premium,
      premiumSource: premium ? "admin_grant" : "admin_revoke",
      premiumUpdatedAt: FieldValue.serverTimestamp(),
      premiumUpdatedBy: actorUid
    },
    { merge: true }
  );
  await writeAuditLog(actorUid, "setUserPremiumEntitlement", { targetUid, premium });
  return { ok: true, uid: targetUid, premium };
});

exports.setProfilePremiumEntitlement = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const actorUid = assertAuth(request);
  assertRole(request, ["admin"]);
  await enforceRateLimit(actorUid, "set_profile_premium", 40);

  const profileKey = asText(request?.data?.profileKey, "", 64).toLowerCase();
  const premium = !!request?.data?.premium;
  if (!profileKey) throw new HttpsError("invalid-argument", "profileKey is required.");

  await db.collection("ironlog").doc("data_shared").set(
    {
      premiumProfiles: { [profileKey]: premium },
      profileData: {
        [profileKey]: {
          premium,
          premiumUpdatedAt: FieldValue.serverTimestamp(),
          premiumUpdatedBy: actorUid
        }
      }
    },
    { merge: true }
  );
  await writeAuditLog(actorUid, "setProfilePremiumEntitlement", { profileKey, premium });
  return { ok: true, profileKey, premium };
});

exports.getClientConfig = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "get_client_config", 60);

  const [flagsSnap, userSnap] = await Promise.all([
    db.collection("config").doc("featureFlags").get(),
    db.collection("users").doc(uid).get()
  ]);

  const flags = { ...DEFAULT_FLAGS, ...(flagsSnap.exists ? flagsSnap.data()?.flags || {} : {}) };
  const user = userSnap.exists ? userSnap.data() : {};
  return {
    flags,
    role: roleFromToken(request),
    premium: user?.premium === true,
    timezone: asText(user?.timezone, "Africa/Johannesburg", 64),
    notifications: user?.notifications || { enabled: true, reminderHour: 18 },
    publicProfile: !!user?.publicProfile,
    coachUid: asText(user?.coachUid, "", 128)
  };
});

exports.upsertFeatureFlag = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  assertRole(request, ["admin"]);
  await enforceRateLimit(uid, "upsert_flag", 30);

  const key = asText(request?.data?.key, "", 80);
  const value = !!request?.data?.value;
  if (!key) throw new HttpsError("invalid-argument", "Flag key is required.");

  await db.collection("config").doc("featureFlags").set(
    { flags: { [key]: value }, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid },
    { merge: true }
  );
  await writeAuditLog(uid, "upsertFeatureFlag", { key, value });
  return { ok: true, key, value };
});

exports.trackClientEvent = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "track_event", 120);
  const eventName = asText(request?.data?.eventName, "", 64);
  if (!eventName) throw new HttpsError("invalid-argument", "eventName is required.");
  const params = request?.data?.params && typeof request.data.params === "object" ? request.data.params : {};
  await db.collection("analytics_events").add({
    uid,
    eventName,
    params,
    createdAt: FieldValue.serverTimestamp()
  });
  return { ok: true };
});

exports.archiveWorkoutEntry = onCall({ region: "us-central1", timeoutSeconds: 60 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "archive_workout", 40);

  const date = asText(request?.data?.date, "", 32);
  const dayKey = asText(request?.data?.dayKey, "", 120);
  const payload = request?.data?.payload && typeof request.data.payload === "object" ? request.data.payload : null;
  if (!date || !dayKey || !payload) {
    throw new HttpsError("invalid-argument", "date, dayKey and payload are required.");
  }

  const archiveId = `${date}_${dayKey}_${Date.now()}`;
  await db.collection("users").doc(uid).collection("workout_archive").doc(archiveId).set({
    uid,
    date,
    dayKey,
    payload,
    softDeleted: true,
    recoverableUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    createdAt: FieldValue.serverTimestamp()
  });
  await writeAuditLog(uid, "archiveWorkoutEntry", { date, dayKey, archiveId });
  return { ok: true, archiveId };
});

exports.restoreWorkoutEntry = onCall({ region: "us-central1", timeoutSeconds: 60 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "restore_workout", 40);
  const archiveId = asText(request?.data?.archiveId, "", 200);
  if (!archiveId) throw new HttpsError("invalid-argument", "archiveId is required.");
  const ref = db.collection("users").doc(uid).collection("workout_archive").doc(archiveId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Archive entry not found.");
  await ref.set({ restoredAt: FieldValue.serverTimestamp(), softDeleted: false }, { merge: true });
  await writeAuditLog(uid, "restoreWorkoutEntry", { archiveId });
  return { ok: true, entry: snap.data() };
});

exports.listArchivedWorkouts = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "list_archived_workouts", 60);
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("workout_archive")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

exports.requestAccountDeletion = onCall({ region: "us-central1", timeoutSeconds: 120 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "delete_account", 5);
  const reason = asText(request?.data?.reason, "", 240);
  await db.collection("account_deletion_requests").doc(uid).set(
    {
      uid,
      reason,
      requestedAt: FieldValue.serverTimestamp(),
      status: "queued"
    },
    { merge: true }
  );
  await writeAuditLog(uid, "requestAccountDeletion", { reason: !!reason });
  return { ok: true };
});

exports.registerPushToken = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "register_push_token", 40);
  const token = asText(request?.data?.token, "", 1000);
  const platform = asText(request?.data?.platform, "web", 32);
  if (!token) throw new HttpsError("invalid-argument", "token is required.");
  await db.collection("users").doc(uid).collection("push_tokens").doc(token).set(
    {
      token,
      platform,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return { ok: true };
});

exports.saveUserPreferences = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "save_preferences", 60);
  const timezone = asText(request?.data?.timezone, "Africa/Johannesburg", 64);
  const reminderHour = Math.min(23, Math.max(0, Number(request?.data?.reminderHour ?? 18)));
  const publicProfile = !!request?.data?.publicProfile;
  const notificationsEnabled = request?.data?.notificationsEnabled !== false;
  await db.collection("users").doc(uid).set(
    {
      timezone,
      publicProfile,
      notifications: { enabled: notificationsEnabled, reminderHour },
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  await writeAuditLog(uid, "saveUserPreferences", { timezone, publicProfile, reminderHour });
  return { ok: true };
});

exports.createInAppNotification = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const actorUid = assertAuth(request);
  assertRole(request, ["admin", "coach"]);
  await enforceRateLimit(actorUid, "create_notification", 100);
  const targetUid = asText(request?.data?.targetUid, "", 128);
  const title = asText(request?.data?.title, "", 120);
  const detail = asText(request?.data?.detail, "", 400);
  if (!targetUid || !title) throw new HttpsError("invalid-argument", "targetUid and title are required.");
  const ref = db.collection("notifications").doc(targetUid).collection("items").doc();
  await ref.set({
    title,
    detail,
    type: asText(request?.data?.type, "system", 32),
    seen: false,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actorUid
  });
  return { ok: true, id: ref.id };
});

exports.listInAppNotifications = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "list_notifications", 90);
  const snap = await db
    .collection("notifications")
    .doc(uid)
    .collection("items")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

exports.markInAppNotificationsSeen = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "mark_notifications_seen", 120);
  const ids = Array.isArray(request?.data?.ids) ? request.data.ids.slice(0, 100) : [];
  const batch = db.batch();
  ids.forEach((id) => {
    if (!id) return;
    const ref = db.collection("notifications").doc(uid).collection("items").doc(String(id));
    batch.set(ref, { seen: true, seenAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  await batch.commit();
  return { ok: true, updated: ids.length };
});

exports.createRecurringPlan = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "recurring plans");
  await enforceRateLimit(uid, "create_recurring_plan", 20);
  const title = asText(request?.data?.title, "", 120);
  const weekdays = Array.isArray(request?.data?.weekdays) ? request.data.weekdays.slice(0, 7) : [];
  if (!title || weekdays.length === 0) {
    throw new HttpsError("invalid-argument", "title and weekdays are required.");
  }
  const ref = db.collection("users").doc(uid).collection("recurring_plans").doc();
  await ref.set({
    title,
    weekdays,
    workoutKeys: Array.isArray(request?.data?.workoutKeys) ? request.data.workoutKeys.slice(0, 10) : [],
    startDate: asText(request?.data?.startDate, "", 32),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return { ok: true, id: ref.id };
});

exports.listRecurringPlans = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "recurring plans");
  await enforceRateLimit(uid, "list_recurring_plans", 60);
  const snap = await db.collection("users").doc(uid).collection("recurring_plans").orderBy("updatedAt", "desc").limit(100).get();
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

exports.applyRecurringPlanNow = onCall({ region: "us-central1", timeoutSeconds: 60 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "recurring plans");
  await enforceRateLimit(uid, "apply_recurring_plan", 40);
  const planId = asText(request?.data?.planId, "", 128);
  if (!planId) throw new HttpsError("invalid-argument", "planId is required.");
  const planRef = db.collection("users").doc(uid).collection("recurring_plans").doc(planId);
  const snap = await planRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Recurring plan not found.");
  const plan = snap.data() || {};
  const instanceRef = db.collection("users").doc(uid).collection("recurring_plan_runs").doc();
  await instanceRef.set({
    planId,
    title: asText(plan.title, "Recurring Plan", 120),
    workoutKeys: Array.isArray(plan.workoutKeys) ? plan.workoutKeys.slice(0, 10) : [],
    createdAt: FieldValue.serverTimestamp()
  });
  await writeAuditLog(uid, "applyRecurringPlanNow", { planId });
  return { ok: true, runId: instanceRef.id };
});

exports.seedWorkoutTemplates = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  assertRole(request, ["admin", "coach"]);
  await enforceRateLimit(uid, "seed_templates", 10);
  const defaults = [
    { key: "beginner_full_body", title: "Beginner Full Body", goal: "General" },
    { key: "hypertrophy_push_pull_legs", title: "Hypertrophy PPL", goal: "Hypertrophy" },
    { key: "strength_5x5", title: "Strength 5x5", goal: "Strength" }
  ];
  const batch = db.batch();
  defaults.forEach((tpl) => {
    const ref = db.collection("global_workout_templates").doc(tpl.key);
    batch.set(
      ref,
      {
        ...tpl,
        exercises: [],
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
  await batch.commit();
  return { ok: true, count: defaults.length };
});

exports.listWorkoutTemplates = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "template imports");
  await enforceRateLimit(uid, "list_templates", 80);
  const snap = await db.collection("global_workout_templates").orderBy("title").limit(100).get();
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

exports.listSocialFeed = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "social feed");
  await enforceRateLimit(uid, "list_social_feed", 90);
  const followingSnap = await db.collection("social_following").doc(uid).collection("users").limit(200).get();
  const following = new Set(followingSnap.docs.map((d) => d.id));
  following.add(uid);
  const postsSnap = await db.collection("social_posts").orderBy("createdAt", "desc").limit(200).get();
  const posts = postsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.visibility === "public" || following.has(String(p.uid || "")))
    .slice(0, 100);
  return { items: posts };
});

exports.getProgressionSuggestion = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "progression suggestions");
  await enforceRateLimit(uid, "progression_suggest", 100);
  const lastWeight = Number(request?.data?.lastWeight ?? 0);
  const targetReps = Number(request?.data?.targetReps ?? 8);
  const completedReps = Number(request?.data?.completedReps ?? 0);
  let nextWeight = lastWeight;
  if (completedReps >= targetReps + 2) nextWeight = lastWeight + 2.5;
  else if (completedReps < Math.max(1, targetReps - 2)) nextWeight = Math.max(0, lastWeight - 2.5);
  const suggestion = { nextWeight: Math.round(nextWeight * 10) / 10, adjustRepsBy: 0 };
  await writeAuditLog(uid, "getProgressionSuggestion", suggestion);
  return suggestion;
});

exports.computeVolumeTrend = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "advanced analytics");
  await enforceRateLimit(uid, "volume_trend", 80);
  const sessions = Array.isArray(request?.data?.sessions) ? request.data.sessions.slice(0, 366) : [];
  const grouped = {};
  sessions.forEach((s) => {
    const date = asText(s?.date, "", 16);
    const volume = Math.max(0, Number(s?.volume || 0));
    if (!date) return;
    grouped[date] = (grouped[date] || 0) + volume;
  });
  const items = Object.keys(grouped)
    .sort()
    .map((date) => ({ date, volume: Math.round(grouped[date]) }));
  return { items };
});

exports.computeMacroAdherence = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "advanced analytics");
  await enforceRateLimit(uid, "macro_adherence", 80);
  const daily = Array.isArray(request?.data?.daily) ? request.data.daily.slice(0, 366) : [];
  const targetProtein = Math.max(1, Number(request?.data?.targetProtein || 1));
  const targetCalories = Math.max(1, Number(request?.data?.targetCalories || 1));
  const result = daily.map((d) => {
    const protein = Math.max(0, Number(d?.protein || 0));
    const calories = Math.max(0, Number(d?.calories || 0));
    return {
      date: asText(d?.date, "", 16),
      proteinPct: Math.round((protein / targetProtein) * 100),
      caloriesPct: Math.round((calories / targetCalories) * 100)
    };
  });
  return { items: result };
});

exports.createSocialPost = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "social posting");
  await enforceRateLimit(uid, "social_post", 30);
  const text = asText(request?.data?.text, "", 600);
  if (!text) throw new HttpsError("invalid-argument", "Post text is required.");
  const ref = db.collection("social_posts").doc();
  await ref.set({
    uid,
    text,
    likes: 0,
    comments: 0,
    visibility: asText(request?.data?.visibility, "friends", 16),
    createdAt: FieldValue.serverTimestamp()
  });
  return { ok: true, id: ref.id };
});

exports.followUser = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "social follows");
  await enforceRateLimit(uid, "follow_user", 120);
  const targetUid = asText(request?.data?.targetUid, "", 128);
  if (!targetUid || targetUid === uid) throw new HttpsError("invalid-argument", "Valid targetUid is required.");
  await db.collection("social_following").doc(uid).collection("users").doc(targetUid).set({
    targetUid,
    createdAt: FieldValue.serverTimestamp()
  });
  return { ok: true };
});

exports.setCoachClientRelationship = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const actorUid = assertAuth(request);
  assertRole(request, ["coach", "admin"]);
  await assertPremiumEntitlement(request, "coach tools");
  await enforceRateLimit(actorUid, "coach_client_link", 60);
  const clientUid = asText(request?.data?.clientUid, "", 128);
  if (!clientUid) throw new HttpsError("invalid-argument", "clientUid is required.");
  await db.collection("coach_clients").doc(actorUid).collection("clients").doc(clientUid).set({
    clientUid,
    linkedAt: FieldValue.serverTimestamp()
  });
  await db.collection("users").doc(clientUid).set({ coachUid: actorUid }, { merge: true });
  return { ok: true };
});

exports.createShareCardPayload = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "share cards");
  await enforceRateLimit(uid, "share_card", 60);
  const payload = {
    title: asText(request?.data?.title, "Progress Update", 80),
    subtitle: asText(request?.data?.subtitle, "", 160),
    stats: Array.isArray(request?.data?.stats) ? request.data.stats.slice(0, 6) : [],
    generatedAt: new Date().toISOString()
  };
  return { payload };
});

exports.setPublicProfile = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "set_public_profile", 30);
  const enabled = !!request?.data?.enabled;
  const displayName = asText(request?.auth?.token?.name || request?.auth?.token?.email || "Iron Log User", "Iron Log User", 120);
  await db.collection("users").doc(uid).set(
    {
      publicProfile: enabled,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  if (enabled) {
    await db.collection("public_profiles").doc(uid).set(
      {
        uid,
        displayName,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  } else {
    await db.collection("public_profiles").doc(uid).delete().catch(() => {});
  }
  return { ok: true, enabled };
});

exports.createReferralCode = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "referrals");
  await enforceRateLimit(uid, "create_referral", 10);
  const code = asText(request?.data?.code, "", 32).toUpperCase() || `IRON${Date.now().toString().slice(-6)}`;
  await db.collection("referrals").doc(code).set(
    {
      code,
      ownerUid: uid,
      uses: 0,
      active: true,
      createdAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return { ok: true, code };
});

exports.redeemReferralCode = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await assertPremiumEntitlement(request, "referrals");
  await enforceRateLimit(uid, "redeem_referral", 20);
  const code = asText(request?.data?.code, "", 32).toUpperCase();
  if (!code) throw new HttpsError("invalid-argument", "code is required.");
  const ref = db.collection("referrals").doc(code);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists || snap.get("active") !== true) throw new HttpsError("not-found", "Referral code not found.");
    txn.set(ref, { uses: asPositiveInt(snap.get("uses"), 0, 100000) + 1 }, { merge: true });
    const redemptionRef = ref.collection("redemptions").doc(uid);
    txn.set(redemptionRef, { uid, redeemedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { ok: true, code };
});

exports.createBillingCheckoutSession = onCall(
  { region: "us-central1", timeoutSeconds: 30 },
  async (request) => {
    const uid = assertAuth(request);
    await enforceRateLimit(uid, "billing_checkout", 20);
    const billingConfigSnap = await db.collection("config").doc("billing").get();
    const provider = asText(billingConfigSnap.get("provider"), "yoco", 32).toLowerCase() || "yoco";
    const checkoutUrl = asText(
      billingConfigSnap.get("yocoCheckoutUrl") || billingConfigSnap.get("checkoutUrl"),
      "",
      500
    );
    if (!checkoutUrl) {
      throw new HttpsError("failed-precondition", "Yoco checkout URL is not configured.");
    }
    await writeAuditLog(uid, "createBillingCheckoutSession", {
      checkoutUrlConfigured: true,
      provider
    });
    return {
      ok: true,
      checkoutUrl,
      provider,
      yocoConfigured: provider === "yoco"
    };
  }
);

exports.registerWebhookEndpoint = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  assertRole(request, ["admin"]);
  await enforceRateLimit(uid, "register_webhook", 40);
  const endpointUrl = asText(request?.data?.endpointUrl, "", 400);
  if (!endpointUrl || !/^https?:\/\//i.test(endpointUrl)) {
    throw new HttpsError("invalid-argument", "A valid endpointUrl is required.");
  }
  const ref = db.collection("webhook_endpoints").doc();
  await ref.set({
    endpointUrl,
    events: Array.isArray(request?.data?.events) ? request.data.events.slice(0, 25) : ["*"],
    active: true,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp()
  });
  return { ok: true, id: ref.id };
});

exports.dispatchWebhookEvent = onCall({ region: "us-central1", timeoutSeconds: 60 }, async (request) => {
  const uid = assertAuth(request);
  assertRole(request, ["admin"]);
  await enforceRateLimit(uid, "dispatch_webhook", 30);
  const eventName = asText(request?.data?.eventName, "", 80);
  const payload = request?.data?.payload && typeof request.data.payload === "object" ? request.data.payload : {};
  if (!eventName) throw new HttpsError("invalid-argument", "eventName is required.");
  await db.collection("webhook_queue").add({
    eventName,
    payload,
    status: "queued",
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp()
  });
  return { ok: true };
});

exports.upsertExerciseCatalogItem = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  assertRole(request, ["admin", "coach"]);
  await enforceRateLimit(uid, "upsert_exercise", 80);
  const name = asText(request?.data?.name, "", 120);
  if (!name) throw new HttpsError("invalid-argument", "name is required.");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  await db.collection("exercise_catalog").doc(slug).set(
    {
      name,
      muscleGroup: asText(request?.data?.muscleGroup, "", 64),
      equipment: asText(request?.data?.equipment, "", 64),
      instructions: asText(request?.data?.instructions, "", 800),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid
    },
    { merge: true }
  );
  return { ok: true, id: slug };
});

exports.listExerciseCatalog = onCall({ region: "us-central1", timeoutSeconds: 30 }, async (request) => {
  const uid = assertAuth(request);
  await enforceRateLimit(uid, "list_exercises", 120);
  const snap = await db.collection("exercise_catalog").orderBy("name").limit(500).get();
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

exports.refreshDailyStats = onSchedule({ schedule: "0 2 * * *", region: "us-central1" }, async () => {
  const usersSnap = await db.collection("users").limit(1000).get();
  const nowIso = new Date().toISOString();
  const batch = db.batch();
  usersSnap.docs.forEach((docSnap) => {
    const uid = docSnap.id;
    const statsRef = db.collection("user_daily_stats").doc(uid);
    batch.set(
      statsRef,
      {
        refreshedAt: FieldValue.serverTimestamp(),
        refreshedAtIso: nowIso
      },
      { merge: true }
    );
  });
  await batch.commit();
  logger.info(`refreshDailyStats completed for ${usersSnap.size} users`);
});

exports.generateReminderNotifications = onSchedule({ schedule: "*/30 * * * *", region: "us-central1" }, async () => {
  const usersSnap = await db.collection("users").where("notifications.enabled", "==", true).limit(1000).get();
  const utcHour = new Date().getUTCHours();
  const batch = db.batch();
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const reminderHour = Number(userDoc.get("notifications.reminderHour") ?? 18);
    if (reminderHour !== utcHour) continue;
    const notifRef = db.collection("notifications").doc(uid).collection("items").doc();
    batch.set(notifRef, {
      title: "Workout reminder",
      detail: "You still have an open training window today.",
      type: "reminder",
      seen: false,
      createdAt: FieldValue.serverTimestamp()
    });
    const tokenSnap = await db.collection("users").doc(uid).collection("push_tokens").limit(100).get();
    const tokens = tokenSnap.docs.map((d) => String(d.id || "").trim()).filter((t) => t && !t.startsWith("web_"));
    if (tokens.length) {
      try {
        await admin.messaging().sendEachForMulticast({
          tokens: tokens.slice(0, 100),
          notification: {
            title: "Workout reminder",
            body: "You still have an open training window today."
          },
          data: { type: "reminder" }
        });
      } catch (error) {
        logger.error("FCM reminder send failed", { uid, error: String(error?.message || error) });
      }
    }
  }
  await batch.commit();
});

exports.alertOnFunctionFailures = onSchedule({ schedule: "*/15 * * * *", region: "us-central1" }, async () => {
  const since = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 60 * 1000));
  const failedAuditSnap = await db
    .collection("audit_logs")
    .where("status", "in", ["fallback", "error", "failed"])
    .where("createdAt", ">=", since)
    .limit(200)
    .get();
  if (failedAuditSnap.empty) return;
  const adminUsers = await db.collection("users").where("role", "==", "admin").limit(50).get();
  const batch = db.batch();
  adminUsers.docs.forEach((adminDoc) => {
    const ref = db.collection("notifications").doc(adminDoc.id).collection("items").doc();
    batch.set(ref, {
      title: "Function alert",
      detail: `${failedAuditSnap.size} backend failures detected in last 15 minutes`,
      type: "ops",
      seen: false,
      createdAt: FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
});

exports.sweepSoftDeletedData = onSchedule({ schedule: "15 3 * * *", region: "us-central1" }, async () => {
  const threshold = admin.firestore.Timestamp.fromDate(new Date());
  const users = await db.collection("users").limit(1000).get();
  for (const userDoc of users.docs) {
    const archiveSnap = await db
      .collection("users")
      .doc(userDoc.id)
      .collection("workout_archive")
      .where("softDeleted", "==", true)
      .where("recoverableUntil", "<=", threshold)
      .limit(200)
      .get();
    if (archiveSnap.empty) continue;
    const batch = db.batch();
    archiveSnap.docs.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
});

exports.deliverWebhookQueue = onSchedule({ schedule: "*/5 * * * *", region: "us-central1" }, async () => {
  const queued = await db.collection("webhook_queue").where("status", "==", "queued").limit(50).get();
  if (queued.empty) return;
  const endpointsSnap = await db.collection("webhook_endpoints").where("active", "==", true).limit(100).get();
  const endpoints = endpointsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  for (const eventDoc of queued.docs) {
    const event = eventDoc.data();
    let failures = 0;
    for (const endpoint of endpoints) {
      const accepts = Array.isArray(endpoint.events) ? endpoint.events : ["*"];
      if (!(accepts.includes("*") || accepts.includes(event.eventName))) continue;
      try {
        const response = await fetch(endpoint.endpointUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventName: event.eventName,
            payload: event.payload || {},
            createdAt: event.createdAt || null
          })
        });
        if (!response.ok) failures += 1;
      } catch (_err) {
        failures += 1;
      }
    }
    await eventDoc.ref.set(
      {
        status: failures === 0 ? "delivered" : "failed",
        deliveredAt: FieldValue.serverTimestamp(),
        failures
      },
      { merge: true }
    );
  }
});
