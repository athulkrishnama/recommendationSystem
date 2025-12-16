import { callMcp } from "../mcp/httpClient";

export interface RecommendationResult {
  success: boolean;
  profileId: string;
  channel: string;
  message?: any;
  error?: string;
}

export async function runRecommendation(
  profileId: string,
  channel: "email" | "whatsapp" | "call_script"
): Promise<RecommendationResult> {
  try {
    console.log(
      `\n🚀 Starting recommendation workflow for profile: ${profileId}`
    );
    console.log(`📱 Target channel: ${channel}\n`);

    console.log("📊 Step 1: Searching for customer profile...");
    const profileResponse = await callMcp("tools/call", {
      name: "search_profiles",
      arguments: { query: profileId },
    });

    const profileData = JSON.parse(profileResponse.content[0].text);

    if (!profileData.profiles || profileData.profiles.length === 0) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const profile = profileData.profiles[0];
    console.log(
      `✅ Found profile: ${profile.name || profile.email || profileId}`
    );

    console.log("\n🎯 Step 2: Matching items to profile...");
    const matchResponse = await callMcp("tools/call", {
      name: "match_items",
      arguments: { profileId: profile.id || profile.email },
    });

    const matchData = JSON.parse(matchResponse.content[0].text);
    console.log(`✅ Found ${matchData.matchCount} matching items`);

    if (matchData.matchCount === 0) {
      throw new Error("No matching items found for this profile");
    }

    console.log("\n📝 Step 3: Drafting recommendation narrative...");
    const draftResponse = await callMcp("tools/call", {
      name: "draft_recommendation",
      arguments: {
        profile: profile,
        matchedItems: matchData.matches,
      },
    });

    const draftData = JSON.parse(draftResponse.content[0].text);
    console.log("✅ Recommendation narrative created");

    console.log(`\n✉️  Step 4: Formatting message for ${channel}...`);
    const messageResponse = await callMcp("tools/call", {
      name: "generate_message",
      arguments: {
        channel: channel,
        recommendationText: draftData.recommendationText,
        profile: profile,
        items: matchData.matches.map((m: any) => m.item),
      },
    });

    const message = JSON.parse(messageResponse.content[0].text);
    console.log("✅ Message formatted successfully\n");

    return {
      success: true,
      profileId,
      channel,
      message,
    };
  } catch (error: any) {
    console.error("❌ Error in recommendation workflow:", error.message);
    return {
      success: false,
      profileId,
      channel,
      error: error.message,
    };
  }
}
