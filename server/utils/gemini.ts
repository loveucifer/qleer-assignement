/**
 * Gemini API client for generating executive summaries.
 * Uses the Gemini 2.5 Flash model via Google's Generative AI API.
 */

import type { ComplianceSummary } from "~~/shared/types/summary";

// Configuration constants
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TEMPERATURE = 0.3;
const GEMINI_MAX_TOKENS = 200;
const GEMINI_THINKING_BUDGET = 0;
const MAX_GAPS_IN_PROMPT = 5;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * Generates a 3-4 sentence executive summary from the compliance data.
 * Returns null if the API call fails or the key is missing.
 */
export async function generateExecutiveSummary(
  summary: ComplianceSummary,
): Promise<string | null> {
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    console.warn(
      "GEMINI_API_KEY not configured — skipping executive summary generation",
    );
    return null;
  }

  const prompt = buildPrompt(summary);

  try {
    const response = await $fetch<GeminiResponse>(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        body: {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: GEMINI_TEMPERATURE,
            maxOutputTokens: GEMINI_MAX_TOKENS,
            thinkingConfig: {
              thinkingBudget: GEMINI_THINKING_BUDGET,
            },
          },
        },
      },
    );

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch (error) {
    console.error("Failed to generate executive summary:", error);
    return null;
  }
}

/**
 * Builds the prompt for Gemini based on the structured compliance data.
 */
function buildPrompt(summary: ComplianceSummary): string {
  const { standard, complianceScore, riskLevel, counts, gaps } = summary;

  const gapDetails = gaps
    .slice(0, MAX_GAPS_IN_PROMPT)
    .map((g) => `- Clause ${g.clause} (${g.status}): ${g.title || "No title"}`)
    .join("\n");

  return `You are a compliance analyst. Generate a concise 3-4 sentence executive summary for this product compliance evaluation.

Standard: ${standard}
Compliance Score: ${complianceScore}%
Risk Level: ${riskLevel}
Status: ${counts.pass} PASS, ${counts.fail} FAIL, ${counts.missing} MISSING, ${counts.na} N/A

Top Gaps:
${gapDetails || "None"}

Write a professional summary that:
1. States the overall compliance status
2. Highlights the risk level and what it means
3. Identifies the most critical gaps (if any)
4. Provides actionable next steps

Keep it concise, factual, and appropriate for a technical compliance report.`;
}
