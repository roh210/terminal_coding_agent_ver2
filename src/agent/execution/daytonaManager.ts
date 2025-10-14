/**
 * DaytonaManager - API-based sandbox execution manager
 *
 * Uses Daytona REST API for direct workspace management and code execution.
 * Provides better performance than CLI-based approach.
 *
 * Architecture:
 * - Direct HTTP calls to Daytona API
 * - Persistent workspaces with caching
 * - Automatic cleanup and resource management
 * - Support for Python, JavaScript, Bash, Go, Rust
 */

export interface DaytonaExecutionResult {
  stdout: string;
  stderr: string;
  error?: string;
  exitCode?: number;
  executionTime: number;
}

export interface DaytonaExecutionOptions {
  timeout?: number;
  language?: "python" | "javascript" | "bash" | "go" | "rust";
  workspaceId?: string;
  persistent?: boolean; // Keep workspace alive for multiple executions
}

export interface DaytonaWorkspace {
  id: string;
  name: string;
  state: "started" | "stopped" | "starting" | "stopping" | "running"; // Daytona uses "state", not "status"
  template?: string;
  snapshot?: string;
  createdAt: string;
  organizationId?: string;
  target?: string;
  user?: string;
}

/**
 * DaytonaManager - Manages Daytona workspaces via REST API
 */
export class DaytonaManager {
  private apiKey: string;
  private baseUrl: string;
  private defaultTimeout: number = 60000; // 60 seconds
  private workspaceCache: Map<string, DaytonaWorkspace> = new Map();

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = process.env.DAYTONA_API_KEY || "";
    this.baseUrl = process.env.DAYTONA_API_URL || "";

    if (!this.apiKey) {
      throw new Error(
        "DAYTONA_API_KEY not found. Get your API key from https://daytona.io/dashboard/settings/api-keys"
      );
    }
  }

  /**
   * Execute code in a Daytona workspace
   */
  async executeCode(
    code: string,
    options: DaytonaExecutionOptions = {}
  ): Promise<DaytonaExecutionResult> {
    const startTime = Date.now();
    const language = options.language || "python";
    const timeout = options.timeout || this.defaultTimeout;
    const persistent = options.persistent || false;

    let workspaceId = options.workspaceId;
    let shouldCleanup = !persistent;

    try {
      // 1. Get or create workspace
      if (!workspaceId) {
        console.log(`📦 Creating ${language} workspace...`);
        const workspace = await this.createWorkspace(language);
        workspaceId = workspace.id;
        shouldCleanup = true; // Always cleanup ad-hoc workspaces
      }

      // 2. Wait for workspace to be ready
      console.log(`⏳ Waiting for workspace ${workspaceId} to be ready...`);
      await this.waitForWorkspace(workspaceId);
      console.log(`✅ Workspace ${workspaceId} is ready!`);

      // 3. Execute code
      console.log(`⚡ Executing ${language} code...`);
      const result = await this.executeInWorkspace(
        workspaceId,
        code,
        language,
        timeout
      );
      console.log(`📤 Execution completed!`);

      // 4. Cleanup if needed
      if (shouldCleanup) {
        console.log(`🧹 Cleaning up workspace...`);
        await this.deleteWorkspace(workspaceId);
      }

      const executionTime = Date.now() - startTime;

      return {
        ...result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Cleanup on error
      if (shouldCleanup && workspaceId) {
        try {
          await this.deleteWorkspace(workspaceId);
        } catch {
          // Ignore cleanup errors
        }
      }

      return {
        stdout: "",
        stderr: error.stderr || "",
        error: error.message,
        exitCode: error.code || 1,
        executionTime,
      };
    }
  }

  /**
   * Create a new workspace via API
   */
  private async createWorkspace(language: string): Promise<DaytonaWorkspace> {
    const template = this.getTemplate(language);
    const name = `sandbox-${language}-${Date.now()}`;
    const url = `${this.baseUrl}/workspace`; // Changed from /workspaces to /workspace

    console.log(`🌐 API Request: POST ${url}`);
    console.log(`📝 Payload:`, { name, template, autoStart: true });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        template,
        autoStart: true,
      }),
    });

    console.log(
      `📡 Response Status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ API Error Response:`, error);
      throw new Error(`Failed to create workspace: ${error}`);
    }

    const workspace = (await response.json()) as DaytonaWorkspace;
    this.workspaceCache.set(workspace.id, workspace);

    return workspace;
  }

  /**
   * Wait for workspace to be in running state
   */
  private async waitForWorkspace(
    workspaceId: string,
    maxWaitTime: number = 60000
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getWorkspaceStatus(workspaceId);

      // Daytona uses "started" status, not "running"
      if (status === "started" || status === "running") {
        return;
      }

      if (status === "stopped") {
        // Try to start it
        await this.startWorkspace(workspaceId);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Workspace ${workspaceId} failed to start within ${maxWaitTime}ms`
    );
  }

  /**
   * Get workspace status
   */
  private async getWorkspaceStatus(workspaceId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/workspace/${workspaceId}`, {
      // Changed from /workspaces to /workspace
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get workspace status: ${response.statusText}`);
    }

    const workspace = (await response.json()) as DaytonaWorkspace;
    console.log(
      `📊 Workspace Status Response:`,
      JSON.stringify(workspace, null, 2)
    );
    this.workspaceCache.set(workspaceId, workspace);

    return workspace.state; // Daytona uses "state", not "status"
  }

  /**
   * Start a workspace
   */
  private async startWorkspace(workspaceId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/workspace/${workspaceId}/start`, // Changed from /workspaces to /workspace
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to start workspace: ${response.statusText}`);
    }
  }

  /**
   * Execute code in workspace via API
   */
  private async executeInWorkspace(
    workspaceId: string,
    code: string,
    language: string,
    timeout: number
  ): Promise<Omit<DaytonaExecutionResult, "executionTime">> {
    // Build execution command based on language
    const command = this.buildExecutionCommand(code, language);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Use Daytona toolbox API for code execution
      const response = await fetch(
        `${this.baseUrl}/toolbox/${workspaceId}/toolbox/process/execute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            command,
            timeout: Math.floor(timeout / 1000), // Daytona expects timeout in seconds
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Execution failed: ${error}`);
      }

      const result = await response.json();
      console.log(`📦 Execution Result:`, JSON.stringify(result, null, 2));

      // Daytona toolbox API returns "result" instead of "stdout"
      return {
        stdout: result.result || result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode || 0,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        return {
          stdout: "",
          stderr: "",
          error: `Execution timeout after ${timeout}ms`,
          exitCode: 124,
        };
      }

      return {
        stdout: "",
        stderr: "",
        error: error.message,
        exitCode: 1,
      };
    }
  }

  /**
   * Build execution command for different languages
   */
  private buildExecutionCommand(code: string, language: string): string {
    // Escape code for shell
    const escapedCode = code.replace(/'/g, "'\\''");

    switch (language) {
      case "python":
        return `python3 -c '${escapedCode}'`;
      case "javascript":
        return `node -e '${escapedCode}'`;
      case "bash":
        return `bash -c '${escapedCode}'`;
      case "go":
        // For Go, we need to create a file
        return `echo '${escapedCode}' > /tmp/main.go && go run /tmp/main.go`;
      case "rust":
        // For Rust, we need to create a file
        return `echo '${escapedCode}' > /tmp/main.rs && rustc /tmp/main.rs -o /tmp/main && /tmp/main`;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Delete a workspace
   */
  private async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/workspace/${workspaceId}`, // Changed from /workspaces to /workspace
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error(
          `Failed to delete workspace ${workspaceId}: ${response.statusText}`
        );
      }

      this.workspaceCache.delete(workspaceId);
    } catch (error) {
      console.error(`Error deleting workspace ${workspaceId}:`, error);
    }
  }

  /**
   * Get Daytona template for language
   */
  private getTemplate(language: string): string {
    const templates: Record<string, string> = {
      python: "python-3.11",
      javascript: "node-20",
      bash: "ubuntu-22.04",
      go: "golang-1.21",
      rust: "rust-1.74",
    };
    return templates[language] || "ubuntu-22.04";
  }

  /**
   * List all workspaces
   */
  async listWorkspaces(): Promise<DaytonaWorkspace[]> {
    const response = await fetch(`${this.baseUrl}/workspace`, {
      // Changed from /workspaces to /workspace
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list workspaces: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Cleanup all cached workspaces
   */
  async cleanupAll(): Promise<void> {
    const workspaceIds = Array.from(this.workspaceCache.keys());

    for (const id of workspaceIds) {
      await this.deleteWorkspace(id);
    }
  }

  /**
   * Convenience methods for specific languages
   */
  async executePython(
    code: string,
    timeout?: number
  ): Promise<DaytonaExecutionResult> {
    return this.executeCode(code, { language: "python", timeout });
  }

  async executeJavaScript(
    code: string,
    timeout?: number
  ): Promise<DaytonaExecutionResult> {
    return this.executeCode(code, { language: "javascript", timeout });
  }

  async executeBash(
    code: string,
    timeout?: number
  ): Promise<DaytonaExecutionResult> {
    return this.executeCode(code, { language: "bash", timeout });
  }

  async executeGo(
    code: string,
    timeout?: number
  ): Promise<DaytonaExecutionResult> {
    return this.executeCode(code, { language: "go", timeout });
  }

  async executeRust(
    code: string,
    timeout?: number
  ): Promise<DaytonaExecutionResult> {
    return this.executeCode(code, { language: "rust", timeout });
  }
}
