const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { buildMealRequest, normalizeMealAnalysis } = require("../mealAnalysisCore");

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath || !process.env.OPENAI_API_KEY) throw new Error("Usage: node test/liveMealAnalysis.js <image>; OPENAI_API_KEY must be configured");
  const imageBase64 = fs.readFileSync(imagePath).toString("base64");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(buildMealRequest(imageBase64, "Test fixture: standard dinner plate")) });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json();
  if (payload.status !== "completed") throw new Error(`Incomplete response: ${JSON.stringify(payload.incomplete_details)}`);
  const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text;
  const result = normalizeMealAnalysis(JSON.parse(outputText));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
