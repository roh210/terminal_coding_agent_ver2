#!/usr/bin/env node
import OpenAI from "openai";
import React from "react";
import { render } from "ink";
import { Agent } from "./agent/agent.js";
import * as dotenv from "dotenv";
import tools from "./agent/tools/index.js";
import { formatToolConsentRequest } from "./agent/formatter.js";
import { AutocompleteInput } from "./components/AutocompleteInput.js";
import { ConfirmPrompt } from "./components/ConfirmPrompt.js";
import { COLORS } from "./agent/constants.js";
import { fileURLToPath } from "url";
import path from "path";

// Get the directory where this script is located (not where it's run from)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the agent's directory, not the current working directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

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
  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(AutocompleteInput, {
        onSubmit: (value: string) => {
          unmount();
          // Small delay to allow Ink to fully cleanup
          setTimeout(() => {
            resolve(value);
          }, 50);
        },
      })
    );
  });
}

function showAgentMessage(message: string): void {
  console.log(`\n${COLORS.brightYellow}LLM${COLORS.reset}: ${message}\n`);
}

async function getPlanApproval(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(ConfirmPrompt, {
        message: `${COLORS.brightMagenta}${message}${COLORS.reset}`,
        defaultValue: true,
        onSubmit: (value: boolean) => {
          unmount();
          // Small delay to allow Ink to fully cleanup
          setTimeout(() => {
            resolve(value);
          }, 50);
        },
      })
    );
  });
}

async function getToolConsent(message: string): Promise<boolean> {
  // Parse tool name and arguments from message
  const match = message.match(/^(\w+)\((.*)\)$/s);
  const formattedMessage = match
    ? formatToolConsentRequest(match[1], JSON.parse(match[2]))
    : message;

  const fullMessage =
    `\n${COLORS.brightGreen}Tool request${COLORS.reset}: ${formattedMessage}\n` +
    `${COLORS.brightYellow}Agent${COLORS.reset}: Continue?`;
  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(ConfirmPrompt, {
        message: fullMessage,
        defaultValue: true,
        onSubmit: (value: boolean) => {
          unmount();
          // Small delay to allow Ink to fully cleanup
          setTimeout(() => {
            resolve(value);
          }, 50);
        },
      })
    );
  });
}
