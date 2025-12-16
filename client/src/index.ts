import "dotenv/config";
import * as readline from "readline";
import { getGeminiModel } from "./gemini/geminiClient";
import { SYSTEM_PROMPT } from "./gemini/systemPrompt";
import { callMcp } from "./mcp/httpClient";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function processQuery(query: string): Promise<void> {
  try {
    const model = getGeminiModel();

    // Get list of available tools
    const toolsResponse = await callMcp("tools/list", {});
    const availableTools = toolsResponse.tools || [];

    // Get available resources to know the valid fields
    const resourcesResponse = await callMcp("resources/list", {});
    const resources = resourcesResponse.resources || [];

    // Fetch field information from resources
    let fieldInfo = "";
    for (const resource of resources) {
      if (resource.uri.includes("identifiers")) {
        const resourceData = await callMcp("resources/read", {
          uri: resource.uri,
        });
        if (resourceData.contents && resourceData.contents[0]) {
          const content = JSON.parse(resourceData.contents[0].text);
          fieldInfo += `\n${resource.name}:\n`;
          fieldInfo += `  Available Fields: ${
            content.projection?.join(", ") || "N/A"
          }\n`;
          fieldInfo += `  Filter Fields: ${
            content.allowedIdentifiers?.join(", ") || "N/A"
          }\n`;
        }
      }
    }

    // Create tool descriptions for Gemini
    const toolDescriptions = availableTools
      .map((tool: any) => {
        return `- ${tool.name}: ${tool.description || "No description"}`;
      })
      .join("\n");

    const prompt = `${SYSTEM_PROMPT}

Available MCP Tools:
${toolDescriptions}

IMPORTANT - Valid Database Fields:
${fieldInfo}

CRITICAL RULES:
1. ONLY use fields listed in "Available Fields" or "Filter Fields" above
2. DO NOT invent or hallucinate field names
3. If the user asks about a field that doesn't exist, map it to the closest valid field
4. Example: "most_spent_amount_this_month" → use "monthlySpend" field instead

User Query: ${query}

Based on the user's query, determine which MCP tool(s) to call and with what parameters.
Respond ONLY with a JSON object in this exact format:
{
  "tool": "tool_name",
  "params": { "arg1": "value1" }
}

If you need to call multiple tools in sequence, just return the FIRST one.`;

    console.log("\n🤔 Processing your query...\n");

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    console.log("📝 Gemini response:", response.substring(0, 200), "...");

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(
        "❌ Could not understand the query. Please be more specific.\n"
      );
      return;
    }

    let toolCall;
    try {
      toolCall = JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      console.log("❌ Error parsing Gemini response:");
      console.log("Raw JSON:", jsonMatch[0]);
      console.log("Error:", error.message);
      return;
    }

    console.log("🔍 Parsed tool call:", JSON.stringify(toolCall, null, 2));

    if (!toolCall.tool) {
      console.log("\n💡 I can help you with product recommendations!");
      console.log("\nTry asking questions like:");
      console.log("  • Find items in electronics category");
      console.log("  • Search for profile athul@example.com");
      console.log("  • Get recommendations for customer profile-123");
      console.log("  • Match products for a specific user");
      console.log("  • Show me laptops under $1000");
      console.log("\n");
      return;
    }

    console.log(`🔧 Calling tool: ${toolCall.tool}`);

    // Handle generate_message requests - need to run full workflow
    if (toolCall.tool === "generate_message") {
      const params = toolCall.params || {};

      // If we have profileId/channel but missing profile object, run workflow
      if (params.profileId || (params.channel && !params.profile)) {
        console.log("\n🔄 Running full recommendation workflow...\n");

        const { runRecommendation } = await import(
          "./workflow/recommendationFlow"
        );

        const profileIdentifier =
          params.profileId || query.match(/\b[\w.]+@[\w.]+\b/)?.[0] || "user";
        const channel = params.channel || "whatsapp";

        const result = await runRecommendation(
          profileIdentifier,
          channel as any
        );

        if (result.success) {
          console.log("\n✅ Message Generated:\n");
          console.log("━".repeat(60));
          if (result.message.subject) {
            console.log(`Subject: ${result.message.subject}`);
          }
          if (result.message.greeting) {
            console.log(`\n${result.message.greeting}`);
          }
          console.log(`\n${result.message.body || result.message.message}`);
          console.log("━".repeat(60));
          console.log();
        } else {
          console.log("\n❌ Workflow failed:", result.error, "\n");
        }
        return;
      }
    }

    let toolParams = toolCall.params || {};
    if (
      toolCall.tool === "filter_items" ||
      toolCall.tool === "filter_profiles"
    ) {
      if (!toolParams.filters) {
        toolParams = { filters: {} };
      }
    }

    const mcpResponse = await callMcp("tools/call", {
      name: toolCall.tool,
      arguments: toolParams,
    });

    if (mcpResponse.content && mcpResponse.content[0]) {
      const resultText = mcpResponse.content[0].text;
      const data = JSON.parse(resultText);

      if (data.error) {
        console.log("\n❌ Error:\n");
        if (data.error.includes("Invalid filter fields")) {
          console.log("The field you're trying to filter by doesn't exist.");
          console.log(
            `Available fields: ${data.error.match(/Allowed fields: (.+)/)?.[1]}`
          );
          console.log("\nTry using one of the allowed fields in your query.");
        } else {
          console.log(data.error);
        }
        console.log();
        return;
      }

      const isProductQuery = query
        .toLowerCase()
        .match(/\b(shoe|product|item|laptop|phone|recommend|suggest|match)\b/);

      if (
        toolCall.tool === "search_profiles" &&
        data.profiles &&
        data.profiles.length > 0 &&
        isProductQuery
      ) {
        const profile = data.profiles[0];
        console.log(`\n✅ Found profile: ${profile.name}\n`);

        const categories = {
          shoe: "footwear",
          laptop: "electronics",
          phone: "electronics",
          tool: "tools",
          hardware: "hardware",
        };

        let category = null;
        for (const [keyword, cat] of Object.entries(categories)) {
          if (query.toLowerCase().includes(keyword)) {
            category = cat;
            break;
          }
        }

        console.log(
          `🔄 Finding matching ${category || "items"} for ${profile.name}...\n`
        );

        const matchResponse = await callMcp("tools/call", {
          name: "match_items",
          arguments: { profileId: profile.id },
        });

        if (matchResponse.content && matchResponse.content[0]) {
          const matchData = JSON.parse(matchResponse.content[0].text);

          let recommendations = matchData.matches || [];
          if (category && recommendations.length > 0) {
            recommendations = recommendations.filter(
              (m: any) =>
                m.item.category?.toLowerCase() === category.toLowerCase()
            );
          }

          if (recommendations.length === 0) {
            console.log(
              `\n💡 No ${category || "items"} found matching ${
                profile.name
              }'s preferences.\n`
            );
            return;
          }

          const recPrompt = `You are a shopping assistant helping recommend products.

Customer Profile:
${JSON.stringify(profile, null, 2)}

Matched Items:
${JSON.stringify(recommendations.slice(0, 5), null, 2)}

Create a friendly, personalized recommendation for ${profile.name}. 
- Explain WHY these items match their preferences
- Highlight 2-3 best options
- Be conversational and helpful
- Focus on the match scores and their purchase history

Response:`;

          const recResult = await model.generateContent(recPrompt);
          console.log(recResult.response.text());
          console.log();
          return;
        }
      }

      console.log("\n🤖 Analyzing results...\n");

      const summaryPrompt = `You are a helpful shopping assistant. 
The user asked: "${query}"

The system returned this data:
${JSON.stringify(data, null, 2)}

Please provide a friendly, conversational summary of these results. 
- Don't just repeat the JSON
- Highlight important information
- Be concise but informative
- Use natural language

Response:`;

      const summaryResult = await model.generateContent(summaryPrompt);
      const conversationalResponse = summaryResult.response.text();

      console.log(conversationalResponse);
      console.log();
    } else {
      console.log("\n✅ Done\n");
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.message, "\n");
  }
}

function askQuestion() {
  rl.question("\n💬 Ask me anything (or 'exit' to quit): ", async (input) => {
    const query = input.trim();

    if (query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
      console.log("\n👋 Goodbye!\n");
      rl.close();
      process.exit(0);
    }

    if (!query) {
      askQuestion();
      return;
    }

    await processQuery(query);
    askQuestion();
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("🤖 MCP Interactive Client");
  console.log("=".repeat(60));
  console.log("\nConnected to MCP Server:", process.env.MCP_SERVER_URL);
  console.log("\nExample queries:");
  console.log("  - Find profile for athul@example.com");
  console.log("  - Get recommendations for customer X");
  console.log("  - Search items in electronics category");
  console.log("  - Match products for profile Y");
  console.log("=".repeat(60));

  askQuestion();
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
