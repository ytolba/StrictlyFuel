const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { buildMealRequest, normalizeMealAnalysis } = require("./mealAnalysisCore");

const openAIKey = defineSecret("OPENAI_API_KEY");
const MODEL = process.env.OPENAI_MEAL_MODEL || "gpt-5.6-sol";

exports.analyzeMealPhoto = onCall({ secrets: [openAIKey], timeoutSeconds: 60, memory: "512MiB", enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to analyze a meal photo.");
  const imageBase64 = String(request.data?.imageBase64 || "");
  const context = String(request.data?.context || "").slice(0, 500);
  if (!imageBase64 || imageBase64.length > 8_000_000) throw new HttpsError("invalid-argument", "Upload one compressed meal photo.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey.value()}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildMealRequest(imageBase64, context, MODEL)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI meal analysis failed", response.status, errorText.slice(0, 500));
    throw new HttpsError("internal", "Meal analysis is temporarily unavailable.");
  }
  const payload = await response.json();
  if (payload.status !== "completed") {
    console.error("OpenAI meal analysis incomplete", payload.status, payload.incomplete_details);
    throw new HttpsError("internal", "The meal estimate was incomplete. Please try again.");
  }
  const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text;
  if (!outputText) throw new HttpsError("internal", "No meal estimate was returned.");
  return normalizeMealAnalysis(JSON.parse(outputText));
});
