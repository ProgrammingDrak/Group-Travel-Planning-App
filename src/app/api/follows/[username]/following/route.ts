import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    // Find the profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", params.username)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get following
    const { data: follows, error } = await supabase
      .from("follows")
      .select("id, created_at, following_id, profiles!follows_following_id_fkey(id, username, display_name, avatar_url)")
      .eq("follower_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const following = (follows ?? []).map((f) => ({
      id: f.id,
      created_at: f.created_at,
      profile: f.profiles,
    }));

    return NextResponse.json({ data: following });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
