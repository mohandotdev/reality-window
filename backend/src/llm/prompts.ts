import type { LLMReasoningRequest } from "./types.js";

export const REASONING_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    assessment: {
      type: "string",
      enum: [
        "supports the assumption",
        "contradicts the assumption",
        "mixed evidence",
        "insufficient evidence",
      ],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reasoning: {
      type: "string",
    },
    keyFindings: {
      type: "array",
      items: {
        type: "string",
      },
    },
    evidenceRequirements: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "assessment",
    "confidence",
    "reasoning",
    "keyFindings",
    "evidenceRequirements",
  ],
};

export const REASONING_SYSTEM_PROMPT = `
You are the reasoning engine for Reality Window.

Your job is to evaluate a real-world assumption using ONLY the supplied web sources.

Never use outside knowledge.
Never invent facts.
Never infer facts that are not supported by the supplied evidence.
Treat source snippets as evidence, not as automatically verified truth.

Determine whether the supplied evidence:
- supports the assumption
- contradicts the assumption
- is mixed
- is insufficient to determine

Identify important evidence, contradictions, uncertainty, and what evidence should be monitored in the future.

Return concise, structured, evidence-based reasoning.
`;

export function buildReasoningPrompt(request: LLMReasoningRequest): string {
  const sources = request.sources
    .map(
      (source, index) => `
SOURCE ${index + 1}
Title: ${source.title}
URL: ${source.url}
Snippet: ${source.snippet}
`,
    )
    .join("\n");

  return `
WHAT TO WATCH:
${request.subject}

CURRENT ASSUMPTION:
${request.assumption}

SUPPLIED SOURCES:
${sources}

TASK:

Evaluate the CURRENT ASSUMPTION using only the SUPPLIED SOURCES.

Return:

1. assessment
Choose exactly one:
- "supports the assumption"
- "contradicts the assumption"
- "mixed evidence"
- "insufficient evidence"

2. confidence
A number between 0 and 1 representing how confident you are in the assessment based ONLY on the supplied evidence.

3. reasoning
Provide a concise explanation of why the evidence supports, contradicts, mixes, or fails to establish the assumption.

4. keyFindings
List the most important evidence from the supplied sources that directly influenced the assessment.

5. evidenceRequirements
List the specific facts, signals, or evidence that Reality Window should monitor in the future to determine whether the assumption remains true or becomes false.

IMPORTANT RULES:

1. Use ONLY information contained in the supplied sources.

2. Do NOT use your own knowledge, training data, or external assumptions.

3. Do NOT invent facts or fill missing information.

4. Do NOT treat the existence, authority, or reputation of a source as proof that its claims are true.

5. Base findings on the actual information contained in the supplied title and snippet.

6. If multiple sources provide conflicting information, explicitly identify the conflict.

7. If sources agree, do not manufacture disagreement.

8. Do not assume that newer information is correct merely because it is newer. Use only the evidence supplied.

9. keyFindings must contain concrete evidence from the supplied sources, not generic statements.

10. evidenceRequirements must describe what should be checked in future monitoring. They should NOT simply repeat keyFindings.

11. evidenceRequirements should be actionable and observable. For example:
- changes to registration requirements
- changes to required fees
- changes to eligibility rules
- changes to enforcement status
- changes to official deadlines
- changes to platform compliance requirements

12. If the supplied sources are insufficient to establish the assumption reliably, set the assessment to "insufficient evidence" and explain what is missing.

13. Keep the response concise.

14. confidence must be a number between 0 and 1.

Return ONLY valid JSON matching the expected response schema.
`;
}
