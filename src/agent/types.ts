import OpenAI from "openai";

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  func: (args: any) => Promise<string> | string;
};

export type PlanStep = {
  action: string;
  tool: string;
  reasoning: string;
};

export type Plan = {
  goal: string;
  steps: PlanStep[];
};

export type AgentDependencies = {
  client: OpenAI;
  tools: ToolDefinition[];
  getUserMessage: () => Promise<string>;
  showAgentMessage: (message: string) => void;
  getToolConsent: (message: string) => Promise<boolean>;
  getPlanApproval: (plan: string) => Promise<boolean>;
};

export type ToolInput =
  | { path: string }
  | { path?: string }
  | Record<string, unknown>;
