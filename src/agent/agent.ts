import OpenAI from "openai";
import { AgentDependencies, Plan } from "./types.js";
import { createPlan } from "./planning/index.js";
import { formatPlan, formatPlanPlainText } from "./formatter.js";
import { executeToolCalls } from "./execution.js";
import {
  runInference,
  extractAssistantMessage,
  hasToolCalls,
} from "./inference.js";

export class Agent {
  private conversation: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private readUserInput: boolean = true;

  constructor(private deps: AgentDependencies) {}

  async run() {
    console.log("Chat with AI Agent (use 'ctrl-c' to exit)");

    while (true) {
      try {
        if (this.readUserInput) {
          const shouldProceed = await this.handleUserInput();
          if (!shouldProceed) {
            continue; // Skip inference if plan was rejected
          }
        }
        await this.processInference();
      } catch (error) {
        console.error("Error: ", error);
        this.readUserInput = true;
      }
    }
  }

  /**
   * Handles user input and planning phase
   * Returns true if should proceed to inference, false if should skip
   */
  private async handleUserInput(): Promise<boolean> {
    const userMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: "user",
      content: await this.deps.getUserMessage(),
    };
    this.conversation.push(userMessage);

    const plan = await createPlan(this.deps.client, this.conversation);

    if (plan) {
      const planApproved = await this.handlePlanApproval(plan);
      if (!planApproved) {
        this.deps.showAgentMessage(
          "Plan rejected. Please refine your request."
        );
        // Remove the user message from conversation since we're not executing
        this.conversation.pop();
        this.readUserInput = true;
        return false; // Don't proceed to inference
      }
    }

    return true; // Proceed to inference
  }

  /**
   * Shows plan to user and gets approval
   */
  private async handlePlanApproval(plan: Plan): Promise<boolean> {
    const planText = formatPlan(plan);
    console.log(planText);

    const approved = await this.deps.getPlanApproval("Execute this plan?");

    if (approved) {
      // Add plain text version to conversation (no ANSI codes)
      const planPlainText = formatPlanPlainText(plan);
      this.conversation.push({
        role: "assistant",
        content: `I will execute the following plan:\n${planPlainText}`,
      });
    }

    return approved;
  }

  /**
   * Runs inference and handles the response
   */
  private async processInference(): Promise<void> {
    const result = await runInference(
      this.deps.client,
      this.conversation,
      this.deps.tools
    );

    const message = extractAssistantMessage(result);
    this.conversation.push(message);

    if (hasToolCalls(message)) {
      const toolResults = await executeToolCalls(
        message.tool_calls!,
        this.deps.tools,
        this.deps.getToolConsent
      );

      this.conversation.push(...toolResults);
      this.readUserInput = false;
    } else {
      if (message.content) {
        this.deps.showAgentMessage(message.content);
      }
      this.readUserInput = true;
    }
  }
}
