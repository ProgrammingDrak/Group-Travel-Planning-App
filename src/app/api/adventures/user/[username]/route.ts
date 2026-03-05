import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    // Find profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", params.username)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check auth for visibility
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("adventure_posts_with_stats")
      .select("*")
      .eq("profile_id", profile.id)
      .order("published_at", { ascending: false });

    // If not the owner, filter by visibility
    if (!user || user.id !== profile.id) {
      if (user) {
        // Authenticated user: check if following
        const { data: followRecord } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .single();

        if (followRecord) {
          query = query.in("visibility", ["public", "followers"]);
        } else {
          query = query.eq("visibility", "public");
        }
      } else {
        query = query.eq("visibility", "public");
      }
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check likes for authenticated user
    if (user && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likes } = await supabase
        .from("adventure_likes")
        .select("adventure_post_id")
        .eq("profile_id", user.id)
        .in("adventure_post_id", postIds);

      const likedPostIds = new Set((likes ?? []).map((l) => l.adventure_post_id));
      const enriched = posts.map((p) => ({
        ...p,
        is_liked: likedPostIds.has(p.id),
      }));

      return NextResponse.json({ data: enriched });
    }

    return NextResponse.json({ data: posts ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
