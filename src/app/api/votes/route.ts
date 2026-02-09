import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createVoteSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { card_id, participant_id, score, is_anonymous } = parsed.data;
    const supabase = createServerSupabaseClient();

    const { data: vote, error } = await supabase
      .from("votes")
      .upsert(
        {
          card_id,
          participant_id,
          score,
          is_anonymous,
        },
        {
          onConflict: "card_id,participant_id",
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: vote });
  } catch (error) {
    console.error("Error upserting vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
