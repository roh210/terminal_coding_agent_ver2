import OpenAI from "openai";
import { ToolDefinition } from "./types";
export class Agent {
  constructor(
    private client: OpenAI,
    private getUserMessage: () => Promise<string>,
    private showAgentMessage: (message: string) => void,
    private getToolConsent: (message: string) => Promise<boolean>,
    private tools: ToolDefinition[] = []
  ) {}

  async run() {
    const conversation: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    console.log("Chat with AI Agent (use 'ctrl-c' to exit)");
    // insert ascii art here
    let readUserInput = true;

    while (true) {
      if (readUserInput) {
        const userMessage: OpenAI.Chat.ChatCompletionMessageParam = {
          role: "user",
          content: await this.getUserMessage(),
        };
        conversation.push(userMessage);
      }
      try {
        const result = await this.runInference(conversation);
        const message = result.choices[0].message;
        // add assistant's response to conversation
        conversation.push(message);
        //handle tool calls if present
        if (message.tool_calls && message.tool_calls.length > 0) {
          readUserInput = false;

          for (const toolCall of message.tool_calls) {
            if (toolCall.type !== "function") continue;
            const toolResult = await this.executeToolCall(
              toolCall.id,
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments || "{}")
            );
            conversation.push(toolResult);
          }
        } else {
          if (message.content) {
            this.showAgentMessage(message.content);
          }
          readUserInput = true;
        }
      } catch (error) {
        console.error("Error: ", error);
        readUserInput = true;
      }
    }
  }

  private async runInference(
    conversation: OpenAI.Chat.ChatCompletionMessageParam[]
  ): Promise<OpenAI.Chat.ChatCompletion> {
    const openAITools: OpenAI.Chat.ChatCompletionTool[] = this.tools.map(
      (tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      })
    );

    return this.client.chat.completions.create({
      model: "deepseek/deepseek-chat-v3.1:free",
      messages: conversation,
      tools: openAITools,
      max_tokens: 4096,
    });
  }

  private async executeToolCall(
    id: string,
    name: string,
    input: unknown
  ): Promise<OpenAI.Chat.ChatCompletionMessageParam> {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return {
        role: "tool" as const,
        tool_call_id: id,
        content: `Tool ${name} not found`,
      };
    }
    const toolDescription = `${name}(${JSON.stringify(input)})`;

    if (!(await this.getToolConsent(toolDescription))) {
      return {
        role: "tool" as const,
        tool_call_id: id,
        content: `User denied consent to use tool ${name}`,
      };
    }
    try {
      const result = await tool.func(input);
      return {
        role: "tool" as const,
        tool_call_id: id,
        content: result,
      };
    } catch (error) {
      return {
        role: "tool" as const,
        tool_call_id: id,
        content: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
