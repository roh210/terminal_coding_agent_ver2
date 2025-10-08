import OpenAI from "openai";
import * as readline from "readline/promises";
import { Agent } from "./agent/agent.js";
import * as dotenv from "dotenv";
import tools from "./agent/tools/index.js";
import { formatToolConsentRequest } from "./agent/formatter.js";

dotenv.config();

main();

async function main() {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const agent = new Agent({
    client,
    getUserMessage,
    showAgentMessage,
    getToolConsent,
    getPlanApproval,
    tools,
  });
  await agent.run();
}

async function getUserMessage(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const userMessage = await rl.question("\u001b[94mYou\u001b[0m:");
  rl.close();
  return userMessage;
}

function showAgentMessage(message: string): void {
  console.log(`\n\u001b[93mLLM\u001b[0m: ${message}\n`);
}

async function getPlanApproval(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const approval = await rl.question(`\u001b[95m${message}\u001b[0m [yes]: `);
  rl.close();

  return approval === "" || approval.toLowerCase() === "yes";
}

async function getToolConsent(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Parse tool name and arguments from message
  const match = message.match(/^(\w+)\((.*)\)$/s);
  const formattedMessage = match
    ? formatToolConsentRequest(match[1], JSON.parse(match[2]))
    : message;

  const consent = await rl.question(
    `\n\u001b[92mTool request\u001b[0m: ${formattedMessage}\n` +
      "\u001b[93mAgent\u001b[0m: Continue? [yes]: "
  );
  rl.close();

  return consent === "" || consent.toLowerCase() === "yes";
}
