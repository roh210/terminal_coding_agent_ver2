export class Agent {
    constructor(client, getUserMessage, showAgentMessage, getToolConsent) {
        this.client = client;
        this.getUserMessage = getUserMessage;
        this.showAgentMessage = showAgentMessage;
        this.getToolConsent = getToolConsent;
    }
    async run() {
        const conversation = [];
        console.log("Chat with AI Agent (use 'ctrl-c' to exit)");
        // insert ascii art here
        let readUserInput = true;
        while (true) {
            if (readUserInput) {
                const userMessage = {
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
            }
            catch (error) {
                console.error("Error: ", error);
                readUserInput = true;
            }
        }
    }
    async runInference(conversation) {
        return this.client.chat.completions.create({
            model: "deepseek/deepseek-chat-v3.1:free",
            messages: conversation,
            max_tokens: 4096,
        });
    }
}
