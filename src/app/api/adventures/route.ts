import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdventurePostSchema } from "@/lib/validations";

// POST: Publish a trip as an adventure post
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createAdventurePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { trip_id, caption, cover_image_url, visibility, tagged_usernames } = parsed.data;

    // Verify the user is a participant of this trip (match by email)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Create the adventure post
    const { data: post, error } = await supabase
      .from("adventure_posts")
      .insert({
        profile_id: user.id,
        trip_id,
        caption,
        cover_image_url,
        visibility,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already published this trip" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add tags if provided
    if (tagged_usernames && tagged_usernames.length > 0) {
      const { data: taggedProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("username", tagged_usernames);

      if (taggedProfiles && taggedProfiles.length > 0) {
        const tags = taggedProfiles.map((p) => ({
          adventure_post_id: post.id,
          tagged_profile_id: p.id,
        }));
        await supabase.from("adventure_tags").insert(tags);
      }
    }

    return NextResponse.json({ data: post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Social feed — posts from users the current user follows
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = (page - 1) * limit;

    if (user) {
      // Authenticated: show posts from followed users + public posts
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = (following ?? []).map((f) => f.following_id);
      // Include own posts too
      followingIds.push(user.id);

      const { data: posts, error } = await supabase
        .from("adventure_posts_with_stats")
        .select("*")
        .or(`profile_id.in.(${followingIds.join(",")}),visibility.eq.public`)
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Check which posts current user has liked
      if (posts && posts.length > 0) {
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
    } else {
      // Unauthenticated: show only public posts
      const { data: posts, error } = await supabase
        .from("adventure_posts_with_stats")
        .select("*")
        .eq("visibility", "public")
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: posts ?? [] });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
