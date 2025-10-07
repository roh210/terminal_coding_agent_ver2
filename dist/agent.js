import OpenAI from "openai";
import * as readline from "readline/promises";
import { Agent } from "./agent/agent.js";
import * as dotenv from "dotenv";
dotenv.config();
main();
async function main() {
    const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
    });
    const agent = new Agent(client, getUserMessage, showAgentMessage, getToolConsent);
    await agent.run();
}
async function getUserMessage() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const userMessage = await rl.question("\u001b[94mYou\u001b[0m:");
    rl.close();
    return userMessage;
}
function showAgentMessage(message) {
    console.log(`\n\u001b[93mClaude\u001b[0m: ${message}\n`);
}
async function getToolConsent(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const consent = await rl.question(`\n\u001b[92mTool request\u001b[0m: ${message}\n` +
        "\u001b[93mAgent\u001b[0m: Continue? [yes]: ");
    rl.close();
    return consent === "" || consent.toLowerCase() === "yes";
}
