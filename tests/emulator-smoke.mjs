const baseUrl = "http://127.0.0.1:5001/demo-ironlog/us-central1/health";
const callableBase = "http://127.0.0.1:5001/demo-ironlog/us-central1";

async function waitForHealth(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(baseUrl, { method: "GET" });
      if (res.ok) {
        const body = await res.json();
        if (body?.ok === true) return body;
      }
    } catch (_err) {
      // emulator may still be starting
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error("Functions emulator health endpoint did not become ready.");
}

const health = await waitForHealth();
if (!health?.service) {
  throw new Error("Missing service identifier in health payload.");
}

async function expectUnauthenticated(callableName, data) {
  const res = await fetch(`${callableBase}/${callableName}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data })
  });
  const payload = await res.json().catch(() => ({}));
  const message = String(payload?.error?.message || "");
  if (res.status === 200 || (!message.includes("unauthenticated") && !message.toLowerCase().includes("sign in"))) {
    throw new Error(`Expected unauthenticated response for ${callableName}, got status ${res.status}`);
  }
}

await expectUnauthenticated("estimateMealNutrition", { meal: "chicken and rice" });
await expectUnauthenticated("createSocialPost", { text: "hello" });

console.log("[smoke] Functions emulator health check passed:", health.service);
