import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Find all trips where this email is a participant
    const { data: participantRecords, error: partError } = await supabase
      .from("participants")
      .select("trip_id")
      .eq("email", email);

    if (partError) {
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    if (!participantRecords || participantRecords.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const tripIds = participantRecords.map((p) => p.trip_id);

    const { data: trips, error: tripError } = await supabase
      .from("trips")
      .select("*, participants(id)")
      .in("id", tripIds)
      .eq("is_template", false)
      .order("start_date", { ascending: true });

    if (tripError) {
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    // Transform to include participant_count
    const result = (trips || []).map((trip) => ({
      ...trip,
      participant_count: Array.isArray(trip.participants)
        ? trip.participants.length
        : 0,
      participants: undefined,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error fetching trips by email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
