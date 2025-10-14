import "dotenv/config";
import { DaytonaManager } from "./agent/execution/daytonaManager.js";

async function testSingleWorkspace() {
  console.log("Creating DaytonaManager...");
  const manager = new DaytonaManager();

  try {
    console.log("\n📦 Creating Python workspace...");
    const result = await manager.executeCode('print("Hello from Daytona!")', {
      language: "python",
      timeout: 30000, // 30 second timeout
    });

    console.log("\n✅ Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

testSingleWorkspace();
