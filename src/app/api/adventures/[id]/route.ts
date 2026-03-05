import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET: Full adventure post with trip itinerary and budget data
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    // Get the adventure post with stats
    const { data: post, error: postError } = await supabase
      .from("adventure_posts_with_stats")
      .select("*")
      .eq("id", params.id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Adventure not found" }, { status: 404 });
    }

    // Get tagged users
    const { data: tags } = await supabase
      .from("adventure_tags")
      .select("id, tagged_profile_id, profiles!adventure_tags_tagged_profile_id_fkey(id, username, display_name, avatar_url)")
      .eq("adventure_post_id", params.id);

    // Get full trip data with cards, expenses, participants
    const [
      { data: cards },
      { data: participants },
      { data: expenses },
      { data: commuteSegments },
    ] = await Promise.all([
      supabase
        .from("cards_with_vote_stats")
        .select("*")
        .eq("trip_id", post.trip_id)
        .order("date", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("participants")
        .select("*")
        .eq("trip_id", post.trip_id),
      supabase
        .from("expenses")
        .select("*, splits:expense_splits(*), line_items:expense_line_items(*), paid_by:participants!expenses_paid_by_participant_id_fkey(first_name, last_name)")
        .eq("card_id.trip_id", post.trip_id),
      supabase
        .from("commute_segments")
        .select("*, options:commute_options(*)")
        .or(`from_card_id.in.(select id from cards where trip_id='${post.trip_id}')`)
    ]);

    // Get expenses through cards (since expenses reference cards, not trips directly)
    const cardIds = (cards ?? []).map((c) => c.id);
    let tripExpenses = expenses ?? [];
    if (cardIds.length > 0 && (!expenses || expenses.length === 0)) {
      const { data: expensesByCards } = await supabase
        .from("expenses")
        .select("*, splits:expense_splits(*, participant:participants(*)), line_items:expense_line_items(*)")
        .in("card_id", cardIds);
      tripExpenses = expensesByCards ?? [];
    }

    // Calculate budget stats
    const totalSpent = tripExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const participantCount = (participants ?? []).length || 1;
    const perPerson = totalSpent / participantCount;

    // Group expenses by category
    const categoryBreakdown: Record<string, number> = {};
    tripExpenses.forEach((e) => {
      const cat = e.category || "Other";
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + Number(e.amount);
    });

    // Check if current user liked this post
    let isLiked = false;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: like } = await supabase
        .from("adventure_likes")
        .select("id")
        .eq("adventure_post_id", params.id)
        .eq("profile_id", user.id)
        .single();
      isLiked = !!like;
    }

    return NextResponse.json({
      data: {
        ...post,
        is_liked: isLiked,
        tags: (tags ?? []).map((t) => ({
          id: t.id,
          tagged_profile_id: t.tagged_profile_id,
          profile: t.profiles,
        })),
        itinerary: {
          cards: cards ?? [],
          participants: participants ?? [],
          commute_segments: commuteSegments ?? [],
        },
        budget: {
          total_spent: totalSpent,
          per_person: perPerson,
          participant_count: participantCount,
          category_breakdown: categoryBreakdown,
          expenses: tripExpenses,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove an adventure post
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("adventure_posts")
      .delete()
      .eq("id", params.id)
      .eq("profile_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
