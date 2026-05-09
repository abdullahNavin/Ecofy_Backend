import crypto from "crypto";
import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { env } from "../../config/env";
import type { IdeaAssistantInput, IdeaAssistantSuggestion } from "./ai.types";

function requireGemini() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("GEMINI_API_KEY is not configured", 503, "GEMINI_NOT_CONFIGURED");
  }
}

function requireOpenAIEmbeddings() {
  if (!env.OPENAI_API_KEY) {
    throw new AppError("OPENAI_API_KEY is not configured", 503, "OPENAI_NOT_CONFIGURED");
  }
}

function buildSchema(categoryNames: string[]) {
  return {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      categoryName: { type: "STRING", enum: categoryNames },
      problemStatement: { type: "STRING" },
      proposedSolution: { type: "STRING" },
      description: { type: "STRING" },
      rationale: { type: "STRING" },
      improvementChecklist: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
    },
    required: [
      "title",
      "categoryName",
      "problemStatement",
      "proposedSolution",
      "description",
      "rationale",
      "improvementChecklist",
    ],
  };
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function geminiTextResponse<T>(
  prompt: string,
  schema: Record<string, unknown>
): Promise<T> {
  requireGemini();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_TEXT_MODEL}:generateContent`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are an expert product and sustainability writing assistant. Produce clean, realistic improvements for an idea submission form.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    }
  );

  const json = await parseJsonSafely<{
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
    error?: { message?: string };
  }>(response);
  if (!response.ok) {
    const message = json?.error?.message ?? "Gemini request failed";
    throw new AppError(message, 502, "GEMINI_REQUEST_FAILED");
  }

  const outputText = json?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

  if (!outputText) {
    throw new AppError("Gemini returned an empty response", 502, "GEMINI_EMPTY_RESPONSE");
  }

  return JSON.parse(outputText) as T;
}

async function openAIEmbedding(input: string): Promise<number[]> {
  requireOpenAIEmbeddings();

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_EMBEDDING_MODEL,
      input,
      encoding_format: "float",
    }),
  });

  const json = await parseJsonSafely<{
    data?: Array<{ embedding?: number[] }>;
    error?: { message?: string };
  }>(response);
  if (!response.ok) {
    const message = json?.error?.message ?? "Embedding request failed";
    throw new AppError(message, 502, "OPENAI_EMBEDDING_FAILED");
  }

  return json?.data?.[0]?.embedding ?? [];
}

function ideaEmbeddingInput(idea: {
  title: string;
  problemStatement: string | null;
  proposedSolution: string | null;
  description: string | null;
  category?: { name: string | null } | null;
}) {
  return [
    `Title: ${idea.title}`,
    `Category: ${idea.category?.name ?? ""}`,
    `Problem: ${idea.problemStatement ?? ""}`,
    `Solution: ${idea.proposedSolution ?? ""}`,
    `Description: ${idea.description ?? ""}`,
  ].join("\n");
}

function hashContent(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }

  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function getIdeaAssistantSuggestion(
  userId: string,
  input: IdeaAssistantInput
) {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (!categories.length) {
    throw new AppError("Create at least one category before using the AI assistant", 422, "CATEGORY_REQUIRED");
  }

  const categoryNames = categories.map((category) => category.name);

  const prompt = [
    "Improve this sustainability idea draft for a public community platform.",
    "Keep claims practical and grounded.",
    "Return sharper copy, better structure, and a suggested category from the allowed list.",
    input.prompt ? `Extra guidance from the user: ${input.prompt}` : "",
    `Current title: ${input.title ?? ""}`,
    `Current problem statement: ${input.problemStatement ?? ""}`,
    `Current proposed solution: ${input.proposedSolution ?? ""}`,
    `Current description: ${input.description ?? ""}`,
    `Monetized: ${input.isPaid ? "yes" : "no"}`,
    input.price ? `Price: ${input.price}` : "",
    `Allowed categories: ${categoryNames.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const suggestion = await geminiTextResponse<IdeaAssistantSuggestion>(
    prompt,
    buildSchema(categoryNames)
  );

  await prisma.aiIdeaSuggestion.create({
    data: {
      userId,
      ideaId: input.ideaId,
      prompt: input.prompt,
      model: env.GEMINI_TEXT_MODEL,
      inputJson: input as unknown as object,
      outputJson: suggestion as unknown as object,
    },
  });

  const categoryId =
    categories.find((category) => category.name === suggestion.categoryName)?.id ??
    categories[0]!.id;

  return { ...suggestion, categoryId };
}

export async function ensureIdeaEmbeddingForIdea(ideaId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      title: true,
      problemStatement: true,
      proposedSolution: true,
      description: true,
      status: true,
      category: { select: { name: true } },
      embedding: {
        select: { id: true, contentHash: true },
      },
    },
  });

  if (!idea || idea.status !== "APPROVED") return null;

  const input = ideaEmbeddingInput(idea);
  const contentHash = hashContent(input);

  if (idea.embedding?.contentHash === contentHash) {
    return prisma.ideaEmbedding.findUnique({ where: { ideaId } });
  }

  const embedding = await openAIEmbedding(input);

  return prisma.ideaEmbedding.upsert({
    where: { ideaId },
    create: {
      ideaId,
      contentHash,
      model: env.OPENAI_EMBEDDING_MODEL,
      dimensions: embedding.length,
      embedding,
    },
    update: {
      contentHash,
      model: env.OPENAI_EMBEDDING_MODEL,
      dimensions: embedding.length,
      embedding,
    },
  });
}

export async function ensureApprovedIdeaEmbeddings() {
  if (!env.OPENAI_API_KEY) return;

  const ideas = await prisma.idea.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      title: true,
      problemStatement: true,
      proposedSolution: true,
      description: true,
      category: { select: { name: true } },
      embedding: { select: { contentHash: true } },
    },
    take: 100,
  });

  for (const idea of ideas) {
    const input = ideaEmbeddingInput(idea);
    const contentHash = hashContent(input);
    if (idea.embedding?.contentHash === contentHash) continue;
    await ensureIdeaEmbeddingForIdea(idea.id);
  }
}
