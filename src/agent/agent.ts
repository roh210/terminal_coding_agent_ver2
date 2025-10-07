import OpenAI from "openai";

export class Agent {
  constructor(
    private client: OpenAI,
    private getUserMessage: () => Promise<string>,
    private showAgentMessage: (message: string) => void,
    private getToolConsent: (message: string) => Promise<boolean>
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
        if (message.content) {
          this.showAgentMessage(message.content);
        }
        readUserInput = true;
      } catch (error) {
        console.error("Error: ", error);
        readUserInput = true;
      }
    }
  }

  private async runInference(
    conversation: OpenAI.Chat.ChatCompletionMessageParam[]
  ): Promise<OpenAI.Chat.ChatCompletion> {
    return this.client.chat.completions.create({
      model: "deepseek/deepseek-chat-v3.1:free",
      messages: conversation,
      max_tokens: 4096,
    });
  }
}
