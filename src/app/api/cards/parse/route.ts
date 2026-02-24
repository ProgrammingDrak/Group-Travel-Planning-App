import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const allCardTypes = [
  "activity", "restaurant", "food", "event", "concert",
  "outdoor", "lodging", "rental", "flight", "shopping",
  "sightseeing", "nightlife", "spa", "sports", "museum", "beach",
];

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    return NextResponse.json(
      { error: "AI features not configured. Add ANTHROPIC_API_KEY to your environment and restart the server." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { messages, tripStartDate, tripEndDate, destination } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const tripContext = [
      destination && `Trip destination: ${destination}`,
      tripStartDate && tripEndDate && `Trip dates: ${tripStartDate} to ${tripEndDate}`,
    ]
      .filter(Boolean)
      .join(". ");

    const systemPrompt = `You are a helpful trip planning assistant. Your job is to help users add activities and events to their travel itinerary.

${tripContext ? `Trip context: ${tripContext}` : ""}

When the user describes an activity, you should:
1. Extract as much structured information as you can
2. Ask friendly, specific follow-up questions for any important missing details — but only ask about things that are genuinely missing and useful (don't ask about everything at once, focus on the most important gaps)
3. When you have enough information, finalize the card

Important fields to gather (roughly in priority order):
- title (what the activity is called)
- type (category)
- date (when)
- start_time (what time)
- location (where)
- budget (estimated cost per person)
- description (useful notes, what to expect, tips)

CRITICAL: You MUST respond with ONLY a valid JSON object. No markdown, no code fences, no explanation text before or after. Your entire response must be parseable by JSON.parse(). Use this exact format:
{
  "message": "A friendly conversational response. Summarize what you understood, ask follow-up questions for missing info, or confirm when you have everything.",
  "data": {
    "title": "string or empty string if unknown",
    "type": "one of: ${allCardTypes.join(", ")}",
    "description": "string, empty if unknown",
    "date": "YYYY-MM-DD or null",
    "start_time": "HH:MM 24h or null",
    "location": "venue name or empty string",
    "address": "full address or empty string",
    "budget": 0,
    "duration_minutes": 0
  },
  "ready": false
}

Set "ready" to true only when you have enough information that the card would be genuinely useful (at minimum a title and at least 2-3 other fields filled in).

Rules:
- If given a URL, infer details from the URL text itself — you cannot browse the web
- Keep title concise (under 60 chars)
- Ask at most 2-3 questions at a time, not a laundry list
- Be conversational and encouraging, not robotic
- budget is per-person cost estimate as a number
- No markdown in your message field, plain text only`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Try several extraction strategies in order
    let parsed: { message: string; data: Record<string, unknown>; ready: boolean } | null = null;

    // 1. Strip markdown code fences and try direct parse
    const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    try { parsed = JSON.parse(stripped); } catch { /* continue */ }

    // 2. Find first { ... } block in the text
    if (!parsed) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* continue */ }
      }
    }

    if (!parsed) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json({ error: "AI returned invalid response. Please try again." }, { status: 500 });
    }

    const d = parsed.data || {};
    const result = {
      title: typeof d.title === "string" ? d.title.slice(0, 200) : "",
      type: allCardTypes.includes(d.type as string) ? d.type : "activity",
      description: typeof d.description === "string" ? d.description.slice(0, 2000) : "",
      date: typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : null,
      start_time: typeof d.start_time === "string" && /^\d{2}:\d{2}$/.test(d.start_time) ? d.start_time : null,
      location: typeof d.location === "string" ? d.location.slice(0, 200) : "",
      address: typeof d.address === "string" ? d.address.slice(0, 500) : "",
      budget: typeof d.budget === "number" && d.budget >= 0 ? d.budget : 0,
      duration_minutes: typeof d.duration_minutes === "number" && d.duration_minutes >= 0 ? d.duration_minutes : 0,
    };

    return NextResponse.json({
      message: typeof parsed.message === "string" ? parsed.message : "",
      data: result,
      ready: parsed.ready === true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error parsing card with AI:", message);

    if (message.includes("401") || message.includes("authentication") || message.includes("invalid x-api-key")) {
      return NextResponse.json({ error: "Invalid API key. Check your ANTHROPIC_API_KEY." }, { status: 500 });
    }
    if (message.includes("credit") || message.includes("balance")) {
      return NextResponse.json({ error: "Anthropic API credit balance is too low. Add credits at console.anthropic.com." }, { status: 500 });
    }

    return NextResponse.json({ error: `AI error: ${message}` }, { status: 500 });
  }
}
