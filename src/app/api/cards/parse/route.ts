import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const allCardTypes = [
  "activity", "restaurant", "food", "event", "concert",
  "outdoor", "lodging", "rental", "flight", "shopping",
  "sightseeing", "nightlife", "spa", "sports", "museum", "beach",
];

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI features not configured. Add ANTHROPIC_API_KEY to your environment." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { input, tripStartDate, tripEndDate, destination } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const tripContext = [
      destination && `Trip destination: ${destination}`,
      tripStartDate && tripEndDate && `Trip dates: ${tripStartDate} to ${tripEndDate}`,
    ]
      .filter(Boolean)
      .join(". ");

    const prompt = `You are helping plan a trip. Extract structured activity/event details from the user's input.
The user may provide:
- A natural language description (e.g. "dinner at a nice Italian place on Thursday around 7pm, budget $50pp")
- A URL to an event, restaurant, Google Maps result, or any website
- A mix of both

${tripContext ? `Context: ${tripContext}` : ""}

User input:
${input.trim()}

Respond with a single JSON object (no markdown, no explanation) with these fields:
{
  "title": "Short, clear activity name (required)",
  "type": "One of: ${allCardTypes.join(", ")}",
  "description": "Relevant notes, details, what to expect (2-3 sentences max, empty string if nothing useful)",
  "date": "YYYY-MM-DD if a specific date can be inferred, otherwise null",
  "start_time": "HH:MM in 24h format if a time is mentioned, otherwise null",
  "location": "Venue/place name only (not full address)",
  "address": "Full street address if available, otherwise empty string",
  "budget": "Estimated cost per person as a number (0 if unknown)",
  "duration_minutes": "Estimated duration in minutes (0 if unknown)"
}

Rules:
- If given a URL, extract details from the URL itself (domain, path, query params) — you cannot browse the web, so infer what you can from the URL text
- For Google Maps URLs, extract the place name from the URL query parameters
- Keep title concise (under 60 chars)
- Pick the most fitting type from the list
- Only include date if clearly stated or strongly implied; do not guess randomly
- budget should be per-person cost estimate`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "AI returned invalid response. Please try again." }, { status: 500 });
    }

    // Sanitize and type-check the response
    const result = {
      title: typeof parsed.title === "string" ? parsed.title.slice(0, 200) : "",
      type: allCardTypes.includes(parsed.type as string) ? parsed.type : "activity",
      description: typeof parsed.description === "string" ? parsed.description.slice(0, 2000) : "",
      date: typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
      start_time: typeof parsed.start_time === "string" && /^\d{2}:\d{2}$/.test(parsed.start_time) ? parsed.start_time : null,
      location: typeof parsed.location === "string" ? parsed.location.slice(0, 200) : "",
      address: typeof parsed.address === "string" ? parsed.address.slice(0, 500) : "",
      budget: typeof parsed.budget === "number" && parsed.budget >= 0 ? parsed.budget : 0,
      duration_minutes: typeof parsed.duration_minutes === "number" && parsed.duration_minutes >= 0 ? parsed.duration_minutes : 0,
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error parsing card with AI:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
