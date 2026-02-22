import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTripSchema } from "@/lib/validations";

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createTripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, destination, start_date, end_date, creator_email, total_budget } = parsed.data;

    const supabase = createServerSupabaseClient();

    // Retry with new invite code on unique constraint collision
    let trip = null;
    let tripError = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const invite_code = generateInviteCode();
      const { data, error } = await supabase
        .from("trips")
        .insert({
          name,
          destination,
          start_date,
          end_date,
          creator_email,
          invite_code,
          total_budget,
        })
        .select()
        .single();

      if (!error) {
        trip = data;
        tripError = null;
        break;
      }

      // If it's a unique constraint violation on invite_code, retry
      if (error.code === "23505" && error.message.includes("invite_code")) {
        tripError = error;
        continue;
      }

      // Any other error, bail out
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!trip) {
      return NextResponse.json(
        { error: tripError?.message || "Failed to generate unique invite code" },
        { status: 500 }
      );
    }

    const emailPrefix = creator_email.split("@")[0];

    const { error: participantError } = await supabase
      .from("participants")
      .insert({
        trip_id: trip.id,
        first_name: "Creator",
        last_name: emailPrefix || "",
        email: creator_email,
        is_organizer: true,
      });

    if (participantError) {
      return NextResponse.json(
        { error: participantError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: trip }, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
