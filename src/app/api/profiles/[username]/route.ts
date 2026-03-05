import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", params.username)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get follower and following counts
    const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    ]);

    // Check if current user follows this profile
    let isFollowing = false;
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id !== profile.id) {
      const { data: followRecord } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .single();
      isFollowing = !!followRecord;
    }

    return NextResponse.json({
      data: {
        ...profile,
        follower_count: followerCount ?? 0,
        following_count: followingCount ?? 0,
        is_following: isFollowing,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
