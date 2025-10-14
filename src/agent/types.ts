import OpenAI from "openai";

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  func: (args: ToolInput) => Promise<string> | string;
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

// Specific tool input types
export type ReadFileInput = {
  path: string;
};

export type ListFilesInput = {
  path?: string;
};

export type EditFileInput = {
  path: string;
  old_str: string;
  new_str: string;
};

export type CreateDirectoryInput = {
  path: string;
};

export type ExecuteCodeInput = {
  code: string;
  language?: "python" | "javascript" | "bash" | "go" | "rust";
  timeout?: number;
};

export type RunShellCommandInput = {
  command: string;
  workingDirectory?: string;
  timeout?: number;
};

// Union of all possible tool inputs
export type ToolInput =
  | ReadFileInput
  | ListFilesInput
  | EditFileInput
  | CreateDirectoryInput
  | ExecuteCodeInput
  | RunShellCommandInput;
