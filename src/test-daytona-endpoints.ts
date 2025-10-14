/**
 * Daytona API Endpoint Diagnostic Tool
 *
 * This script helps identify the correct API endpoints for Daytona
 */

import dotenv from "dotenv";
dotenv.config();

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY || "";
const BASE_URL = process.env.DAYTONA_API_URL || "";

// Common endpoint variations to try
const ENDPOINTS_TO_TEST = [
  "/workspaces",
  "/workspace",
  "/v1/workspaces",
  "/v1/workspace",
  "/api/workspaces",
  "/api/workspace",
  "/projects",
  "/environments",
];

async function testEndpoint(endpoint: string) {
  const url = `${BASE_URL}${endpoint}`;

  console.log(`\n🔍 Testing: ${url}`);

  try {
    // Try GET first
    const getResponse = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DAYTONA_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`   GET: ${getResponse.status} ${getResponse.statusText}`);

    if (getResponse.ok) {
      const data = await getResponse.text();
      console.log(`   ✅ GET Success:`, data.substring(0, 200));
    }

    // Try POST with minimal payload
    const postResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAYTONA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `test-${Date.now()}`,
        template: "python-3.11",
      }),
    });

    console.log(`   POST: ${postResponse.status} ${postResponse.statusText}`);

    if (postResponse.ok) {
      const data = await postResponse.text();
      console.log(`   ✅ POST Success:`, data.substring(0, 200));
    } else {
      const error = await postResponse.text();
      console.log(`   ❌ POST Error:`, error.substring(0, 200));
    }
  } catch (error: any) {
    console.log(`   ❌ Network Error:`, error.message);
  }
}

async function runDiagnostics() {
  console.log("━".repeat(70));
  console.log("🔬 Daytona API Endpoint Diagnostics");
  console.log("━".repeat(70));

  console.log(`\n📋 Configuration:`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   API Key: ${DAYTONA_API_KEY ? "✅ Set" : "❌ Missing"}`);
  console.log(`   API Key Length: ${DAYTONA_API_KEY.length} characters`);

  if (!DAYTONA_API_KEY) {
    console.log(`\n❌ DAYTONA_API_KEY not found in .env file`);
    process.exit(1);
  }

  if (!BASE_URL) {
    console.log(`\n❌ DAYTONA_API_URL not found in .env file`);
    process.exit(1);
  }

  console.log(`\n🌐 Testing Endpoints...`);
  console.log("━".repeat(70));

  for (const endpoint of ENDPOINTS_TO_TEST) {
    await testEndpoint(endpoint);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay
  }

  console.log(`\n${"━".repeat(70)}`);
  console.log(`\n💡 Recommendations:`);
  console.log(
    `   1. Check the endpoints that returned 200 or 201 status codes`
  );
  console.log(`   2. Look for endpoints that accepted POST requests`);
  console.log(`   3. Refer to Daytona's official API documentation`);
  console.log(`   4. Check if you need to use their SDK instead of REST API`);
  console.log(`\n📚 Daytona Documentation: https://daytona.io/docs`);
  console.log("━".repeat(70));
}

runDiagnostics().catch(console.error);
