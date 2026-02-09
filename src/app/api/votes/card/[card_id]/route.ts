import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { card_id: string } }
) {
  try {
    const { card_id } = params;
    const supabase = createServerSupabaseClient();

    const { data: votes, error } = await supabase
      .from("votes")
      .select("*, participant:participants(id, first_name, last_name, email)")
      .eq("card_id", card_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: votes });
  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
