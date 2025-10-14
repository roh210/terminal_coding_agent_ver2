import "dotenv/config";

const API_KEY = process.env.DAYTONA_API_KEY!;
const BASE_URL = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";

// First create a workspace
async function testExecEndpoints() {
  console.log("Creating test workspace...\n");

  const createResponse = await fetch(`${BASE_URL}/workspace`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `exec-test-${Date.now()}`,
      template: "python-3.11",
      autoStart: true,
    }),
  });

  const workspace = await createResponse.json();
  const workspaceId = workspace.id;
  console.log(`✅ Created workspace: ${workspaceId}\n`);

  // Wait a bit for workspace to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Try different exec endpoints
  const execEndpoints = [
    `/workspace/${workspaceId}/exec`,
    `/workspace/${workspaceId}/execute`,
    `/workspace/${workspaceId}/run`,
    `/workspace/${workspaceId}/command`,
    `/workspace/${workspaceId}/commands`,
    `/exec/${workspaceId}`,
    `/execute/${workspaceId}`,
  ];

  const testCommand = {
    command: "echo 'Hello'",
  };

  console.log("Testing execution endpoints...\n");

  for (const endpoint of execEndpoints) {
    try {
      const fullUrl = `${BASE_URL}${endpoint}`;
      console.log(`🔍 Testing: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testCommand),
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ SUCCESS!`, JSON.stringify(result, null, 2));
      } else {
        const error = await response.json();
        console.log(`   ❌ Error:`, error.message || error);
      }
    } catch (error: any) {
      console.log(`   ❌ Exception:`, error.message);
    }
    console.log();
  }

  // Cleanup
  console.log(`\n🧹 Cleaning up workspace ${workspaceId}...`);
  await fetch(`${BASE_URL}/workspace/${workspaceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  console.log("✅ Cleanup complete");
}

testExecEndpoints();
