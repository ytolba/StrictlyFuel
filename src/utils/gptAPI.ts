// src/utils/gptAPI.ts
import { OPENAI_API_KEY } from "@env";
import EventSource from "react-native-sse";
import OpenAI from "openai-react-native";

// The app currently talks directly to OpenAI for development. For production,
// move this call behind a Firebase Function so the secret is never bundled.
const client = new OpenAI({
  apiKey: OPENAI_API_KEY || "missing-openai-key",
  baseURL: "https://api.openai.com/v1",
});

// GPT-5.4 nano is optimized for high-volume classification, extraction, and ranking.
export const STRICTLY_MODEL = "gpt-5.4-nano";

export type IngredientAnalysis = {
  category: string;
  normalizedIngredients: string[];
  ingredientConcerns: Array<{
    ingredient: string;
    concern: string;
    severity: "low" | "medium" | "high";
    evidence: string;
  }>;
  positiveSignals: string[];
  confidence: number;
  explanation: string;
};

/** Extracts an ingredient label when on-device OCR cannot read the image. */
export const extractIngredientsFromImage = async (base64Image: string): Promise<string> => {
  const response = await client.chat.completions.create({
    model: STRICTLY_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read this product label. Return only the complete ingredient list as plain text, beginning with Ingredients:. If there is no readable ingredient list, return an empty response. Do not guess ingredients.",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: "high" },
          },
        ],
      },
    ],
  });

  return typeof response.choices[0]?.message.content === "string"
    ? response.choices[0].message.content.trim()
    : "";
};
export const evaluateIngredientsOld = async (
  ingredients: string[]
): Promise<string> => {
  const response = await client.chat.completions.create({
    model: STRICTLY_MODEL,
    messages: [
      {
        role: "system",
        content: "Explain ingredient concerns cautiously and factually. Do not use binary Based/Not classifications, diagnose, prescribe, or call a product universally healthy or harmful.",
      },
      {
        role: "user",
        content: `Give a concise explanation for these ingredients: ${ingredients.join(", ")}`,
      },
    ],
  });
  return typeof response.choices[0]?.message.content === "string"
    ? response.choices[0].message.content.trim()
    : "No explanation available.";
};

interface EvaluateIngredientsOptions {
  onChunk: (chunk: string) => void; // Called whenever a new text chunk is received
  onError?: (error: Error) => void; // Called if there's an SSE error
  onDone?: () => void; // Called when the streaming is complete
  onResult?: (result: IngredientAnalysis) => void;
}

const INGREDIENT_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string" },
    normalizedIngredients: { type: "array", items: { type: "string" } },
    ingredientConcerns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          ingredient: { type: "string" },
          concern: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          evidence: { type: "string" },
        },
        required: ["ingredient", "concern", "severity", "evidence"],
      },
    },
    positiveSignals: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    explanation: { type: "string" },
  },
  required: [
    "category",
    "normalizedIngredients",
    "ingredientConcerns",
    "positiveSignals",
    "confidence",
    "explanation",
  ],
};

export const evaluateIngredients = (
  ingredients: string[],
  { onChunk, onError, onDone, onResult }: EvaluateIngredientsOptions
) => {
  const run = client.chat.completions.create({
    model: STRICTLY_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are Strictly's ingredient intelligence layer. Analyze only what is supported by the supplied ingredient names. Never diagnose, prescribe, or call a product universally healthy or harmful. The app calculates the final 0-100 score separately.",
      },
      {
        role: "user",
        content: `Return a structured analysis for these ingredients: ${ingredients.join(", ")}. Normalize names, infer a broad product category, list specific concerns with cautious language, list positive signals, provide a confidence score from 0 to 100, and write a concise explanation for the user. If evidence is uncertain, say so and lower confidence. Do not return Based, Not, or Unknown classifications.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "strictly_ingredient_analysis",
        strict: true,
        schema: INGREDIENT_ANALYSIS_SCHEMA,
      },
    },
  } as any);

  run
    .then((response) => {
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string") throw new Error("No structured analysis returned");
      const result = JSON.parse(content) as IngredientAnalysis;
      onResult?.(result);
      onDone?.();
    })
    .catch((error) => onError?.(error));

  return run as any;

  // Construct the user message
  const userMessage = {
    role: "user" as const,
    content: `
Adjusted Classification Criteria:
	•	Based:
	•	The item has ingredients that align with avoiding harmful components and potentially support a healthy lifestyle or good endocrine function.
	•	If an ingredient’s effects are ambiguous or uncertain, and there is no clear evidence that it is harmful or disrupts the endocrine system, classify the item as Based.
	•	Not:
	•	The item contains one or more ingredients known to be harmful or likely to negatively impact endocrine health or overall health.
	•	Justification for “Not" should mention only the harmful ingredients and their negative effects (e.g., hormone disruption, gut inflammation).
	•	Unknown:
	•	Use this classification only if no ingredients are provided at all (i.e., no information available).

Output Format:
	1.	Start your response with either “Based,” “Not,” or “Unknown” (in the case where there are no ingredients).
	2.	For “Not" items, list each harmful ingredient as a separate sentence, detailing its negative impact on endocrine health or gut health. 
	3.	For “Based” items, list any pro-endocrine or pro-gut health ingredients, each in its own sentence. 
	4.	If there is any uncertainty or ambiguity regarding the harmfulness of ingredients, default to “Based” as long as there is no clear harmful evidence.
  5.  Make sure to cite sources for each ingredient or claim you make using real webpage links from the following: 'U.S. Food and Drug Administration',
   'FDA',
   'USDA',
   'NIH',
   'U.S. National Library of Medicine',
   'World Health Organization',
   'Centers for Disease Control and Prevention',
   'CDC',
   'European Food Safety Authority',
   'National Institutes of Health',
   'Mayo Clinic',
   'Harvard Medical School',
   'Johns Hopkins Medicine',
   'American Academy of Pediatrics',
   'Environmental Working Group',
   'Health Canada',
   'National Institute of Diabetes and Digestive and Kidney Disease': 

  
	6.	For “Unknown” items, a single classification line is sufficient, as no ingredients are known.

Examples:
- **Input**: Grilled salmon with steamed broccoli
  - **Output**: Based  
**Salmon** is rich in omega-3 fatty acids, which may support testosterone production, (Source: CDC) https://www.cdc.gov/testorone 
**Broccoli** contains compounds that can help regulate estrogen levels, promoting a favorable environment for testosterone. (Source: CDC) https://www.cdc.gov/testorone 

- **Input**: Organic Soy Milk, Sugar, Red 40, Artificial Flavor, Sucralose, Soy lecithin
  - **Output**: Not   
**Oranic Soy Milk** is a common allergen and may cause gut inflammation. (Source: FDA) https://www.fda.gov/your-soy-milk.html
**Red 40** is a synthetic dye that may disrupt hormone balance. (Source: NIH) https://www.NIH.gov/perservatives
**Artificial flavor** can contain harmful chemicals that negatively impact gut health.(Source: Mayo Clinic) https://www.Mayoclinic.edu/faq
**Sucralose** is an artificial sweetener that may disrupt the gut microbiome.(Source: Harvard Medical School) https://www.harvard.edu/sucralose
**Soy lecithin** is a common allergen and may cause gut inflammation.(Source: American Academy of Pediatrics) https://www.aap.org/healthfaq.html


${ingredients.join(", ")}
`,
  };

  // Initiate streaming
  const sse = client.chat.completions.stream(
    {
      model: "gpt-4o-mini", // Adjust model as needed
      messages: [userMessage],
      top_p: 1, // Set top_p to 0.01
      temperature: 0.01, // Set temperature to 0.01
    },
    (data) => {
      // Called for each streamed chunk
      //throw new Error("Artificial error for testing");
      const chunk = data.choices[0]?.delta?.content;
      if (chunk) {
        //console.log("Received chunk:", chunk);
        onChunk(chunk); // Pass chunk to the provided callback
      }
    },
    {
      onOpen: () => {
        console.log("SSE connection for completion opened.");
      },
      onError: (error) => {
        console.error("SSE Error:", error);
        if (onError) onError(error);
      },
      onDone: () => {
        console.log("SSE stream complete.");
        if (onDone) onDone();
      },
    }
  );

  // Return the SSE instance if you need to close it early from the frontend
  return sse;
};
export const classifyEvaluateIngredients = (
  base64Image: string, // New parameter for image
  { onChunk, onError, onDone }: EvaluateIngredientsOptions
) => {
  // Construct the user message
  const imageBase64 = `data:image/jpeg;base64,${base64Image}`;
  const message = `This should be an image of some sort of food product if it is not just say "IT IS NOT" else decipher its ingredients, the ingredients will not be given to you, you must come up with them and then follow the following format to rate the product as based or not based: Adjusted Classification Criteria:
	•	Based:
	•	The item has ingredients that align with avoiding harmful components and potentially support a healthy lifestyle or good endocrine function.
	•	If an ingredient’s effects are ambiguous or uncertain, and there is no clear evidence that it is harmful or disrupts the endocrine system, classify the item as Based.
	•	Not:
	•	The item contains one or more ingredients known to be harmful or likely to negatively impact endocrine health or overall health.
	•	Justification for “Not" should mention only the harmful ingredients and their negative effects (e.g., hormone disruption, gut inflammation).
	•	Unknown:
	•	Use this classification only if no ingredients are provided at all (i.e., no information available).

Output Format:
	1.	Start your response with either “Based,” “Not,” or “Unknown” (in the case where there are no ingredients).
	2.	For “Not" items, list each harmful ingredient as a separate sentence, detailing its negative impact on endocrine health or gut health. 
	3.	For “Based” items, list any pro-endocrine or pro-gut health ingredients, each in its own sentence. 
	4.	If there is any uncertainty or ambiguity regarding the harmfulness of ingredients, default to “Based” as long as there is no clear harmful evidence.
  5.  Make sure to cite sources for each ingredient or claim you make using real webpage links from the following: 'U.S. Food and Drug Administration',
   'FDA',
   'USDA',
   'NIH',
   'U.S. National Library of Medicine',
   'World Health Organization',
   'Centers for Disease Control and Prevention',
   'CDC',
   'European Food Safety Authority',
   'National Institutes of Health',
   'Mayo Clinic',
   'Harvard Medical School',
   'Johns Hopkins Medicine',
   'American Academy of Pediatrics',
   'Environmental Working Group',
   'Health Canada',
   'National Institute of Diabetes and Digestive and Kidney Disease': 

  
	6.	For “Unknown” items, a single classification line is sufficient, as no ingredients are known.

Examples:
- **Input**: Grilled salmon with steamed broccoli
  - **Output**: Based  
**Salmon** is rich in omega-3 fatty acids, which may support testosterone production, (Source: CDC) https://www.cdc.gov/testorone 
**Broccoli** contains compounds that can help regulate estrogen levels, promoting a favorable environment for testosterone. (Source: CDC) https://www.cdc.gov/testorone 

- **Input**: Organic Soy Milk, Sugar, Red 40, Artificial Flavor, Sucralose, Soy lecithin
  - **Output**: Not   
**Oranic Soy Milk** is a common allergen and may cause gut inflammation. (Source: FDA) https://www.fda.gov/your-soy-milk.html
**Red 40** is a synthetic dye that may disrupt hormone balance. (Source: NIH) https://www.NIH.gov/perservatives
**Artificial flavor** can contain harmful chemicals that negatively impact gut health.(Source: Mayo Clinic) https://www.Mayoclinic.edu/faq
**Sucralose** is an artificial sweetener that may disrupt the gut microbiome.(Source: Harvard Medical School) https://www.harvard.edu/sucralose
**Soy lecithin** is a common allergen and may cause gut inflammation.(Source: American Academy of Pediatrics) https://www.aap.org/healthfaq.html`
    // Construct the message
  const userMessage = [
    {
        role: "user" as const,
        content: [
          { type: "text" as const, text: message},
          { type: "image_url" as const, image_url: { url: imageBase64 } }, // Pass Base64 directly
        ],
      },
    ];

  // Initiate streaming
  const sse = client.chat.completions.stream(
    {
      model: STRICTLY_MODEL,
      messages: userMessage,
      top_p: 1, 
      temperature: 0.01,
    },
    (data) => {
      // Called for each streamed chunk
      const chunk = data.choices[0]?.delta?.content;
      if (chunk) {
        onChunk(chunk); // Pass chunk to the provided callback
      }
    },
    {
      onOpen: () => {
        console.log("SSE connection for completion opened.");
      },
      onError: (error) => {
        console.error("SSE Error:", error);
        if (onError) onError(error);
      },
      onDone: () => {
        console.log("SSE stream complete.");
        if (onDone) onDone();
      },
    }
  );
};
