export type WorkflowDefinitionConfig = {
  key: string;
  version: number;
  name: string;
  initialState: string;
  states: Record<string, { terminal?: boolean }>;
  transitions: Record<
    string,
    {
      from: string | string[];
      to: string;
      description?: string;
    }
  >;
};

