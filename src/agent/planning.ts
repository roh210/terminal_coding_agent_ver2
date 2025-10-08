import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { Plan } from "./types.js";
import { NO_PLAN_NEEDED, PLANNING_PROMPT, DEFAULT_MODEL } from "./constants.js";

/**
 * Loads README.md content for context
 */
export const loadReadmeContext = async (): Promise<string> => {
  try {
    const readmePath = path.join(process.cwd(), "README.MD");
    const content = await fs.readFile(readmePath, "utf-8");
    return content;
  } catch (error) {
    console.warn("Could not load README.MD for context");
    return "";
  }
};

/**
 * Extracts JSON from a string response
 */
export const extractJsonFromResponse = (content: string): string | null => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
};

/**
 * Parses a plan from JSON string
 */
export const parsePlan = (jsonString: string): Plan | null => {
  try {
    const parsed = JSON.parse(jsonString) as Plan;

    // Validate plan structure
    if (!parsed.goal || !parsed.steps || !Array.isArray(parsed.steps)) {
      console.error("\n❌ Invalid plan structure:");
      console.error("Missing required fields: goal or steps");
      console.error("Parsed plan:", parsed);
      return null;
    }

    // Validate each step has required fields
    for (const step of parsed.steps) {
      if (!step.action || !step.tool || !step.reasoning) {
        console.error("\n❌ Invalid step structure:");
        console.error(
          "Step missing required fields (action, tool, or reasoning)"
        );
        console.error("Invalid step:", step);
        return null;
      }
    }

    return parsed;
  } catch (error) {
    console.error("\n❌ Failed to parse plan JSON:");
    console.error("JSON String:", jsonString);
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
};

/**
 * Checks if the response indicates no plan is needed
 */
export const isPlanNeeded = (content: string | null): boolean => {
  return content !== null && !content.includes(NO_PLAN_NEEDED);
};

/**
 * Creates a planning prompt by adding system message to conversation
 * Now includes README context for better understanding of project structure
 */
export const createPlanningPrompt = async (
  conversation: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> => {
  const readmeContext = await loadReadmeContext();

  const contextualPrompt = readmeContext
    ? `Project Context (from README.MD):\n${readmeContext}\n\n---\n\n${PLANNING_PROMPT}`
    : PLANNING_PROMPT;

  return [
    ...conversation,
    {
      role: "system",
      content: contextualPrompt,
    },
  ];
};

/**
 * Main function to create a plan from conversation history
 * This is the only non-pure function as it calls the OpenAI API
 */
export const createPlan = async (
  client: OpenAI,
  conversation: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<Plan | null> => {
  const planningPrompt = await createPlanningPrompt(conversation);

  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: planningPrompt,
    max_tokens: 2048,
  });

  const content = response.choices[0].message.content;

  if (!isPlanNeeded(content)) {
    return null;
  }

  const jsonString = extractJsonFromResponse(content!);
  if (!jsonString) {
    console.log("\n⚠️  No JSON found in planning response");
    console.log("AI Response:", content);
    return null;
  }

  const plan = parsePlan(jsonString);

  if (!plan) {
    console.log("\n❌ Failed to parse plan. Raw AI response was:");
    console.log(content);
  }

  return plan;
};
