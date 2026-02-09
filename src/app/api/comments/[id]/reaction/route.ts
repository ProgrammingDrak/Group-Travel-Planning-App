import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addReactionSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const parsed = addReactionSchema.safeParse({
      ...body,
      comment_id: id,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { comment_id, participant_id, emoji } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Check if the reaction already exists (toggle behavior)
    const { data: existing, error: fetchError } = await supabase
      .from("comment_reactions")
      .select("id")
      .eq("comment_id", comment_id)
      .eq("participant_id", participant_id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    if (existing) {
      // Reaction exists, delete it (toggle off)
      const { error: deleteError } = await supabase
        .from("comment_reactions")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: { deleted: true } });
    }

    // Reaction does not exist, insert it (toggle on)
    const { data: reaction, error: insertError } = await supabase
      .from("comment_reactions")
      .insert({
        comment_id,
        participant_id,
        emoji,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: reaction });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
