import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { Plan } from "../types.js";
import {
  NO_PLAN_NEEDED,
  PLANNING_PROMPT,
  DEFAULT_MODEL,
  COLORS,
  ICONS,
} from "../constants.js";
import { ParserChain } from "./parsers/index.js";
import { PlanValidator } from "./validators/index.js";

/**
 * Loads README.md content to provide project context to the AI
 * This helps the AI understand the project structure and constraints
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
 * Checks if the AI response indicates a plan is needed
 * Simple questions or conversations don't need execution plans
 */
export const isPlanNeeded = (content: string | null): boolean => {
  return content !== null && !content.includes(NO_PLAN_NEEDED);
};

/**
 * Creates a planning prompt with README context
 * Combines the conversation history with project context and planning instructions
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
 * Main function to create an execution plan from conversation history
 *
 * This orchestrates the entire planning process:
 * 1. Creates a planning prompt with context
 * 2. Calls the AI to generate a plan
 * 3. Extracts and validates the JSON response
 * 4. Parses into a Plan object
 *
 * Returns null if no plan is needed or if planning fails
 */
export const createPlan = async (
  client: OpenAI,
  conversation: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<Plan | null> => {
  // Create prompt with README context
  const planningPrompt = await createPlanningPrompt(conversation);

  // Call AI to generate plan
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: planningPrompt,
    max_tokens: 2048,
  });

  const content = response.choices[0].message.content;

  // Check if plan is needed
  if (!isPlanNeeded(content)) {
    return null;
  }

  // Extract JSON from response using parser chain
  const parserChain = new ParserChain();
  const parserResult = parserChain.parse(content!);

  if (!parserResult || !parserResult.success) {
    console.log(
      `\n${COLORS.yellow}${ICONS.warning} No JSON found in planning response${COLORS.reset}`
    );
    console.log(`${COLORS.gray}AI Response:${COLORS.reset}`, content);
    return null;
  }

  const jsonString = parserResult.jsonString!;

  // Validate and parse plan
  const plan = PlanValidator.validate(jsonString);

  if (!plan) {
    console.log(
      `\n${COLORS.red}${ICONS.error} Failed to validate plan. Raw AI response was:${COLORS.reset}`
    );
    console.log(`${COLORS.gray}${content}${COLORS.reset}`);
  }

  return plan;
};
