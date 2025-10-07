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
