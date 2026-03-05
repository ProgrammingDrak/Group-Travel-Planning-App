import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify post ownership
    const { data: post } = await supabase
      .from("adventure_posts")
      .select("id")
      .eq("id", params.id)
      .eq("profile_id", user.id)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Not authorized to tag on this post" }, { status: 403 });
    }

    const body = await request.json();
    const { tagged_profile_id } = body;

    if (!tagged_profile_id) {
      return NextResponse.json({ error: "tagged_profile_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("adventure_tags")
      .insert({
        adventure_post_id: params.id,
        tagged_profile_id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "User already tagged" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taggedProfileId = searchParams.get("tagged_profile_id");

    if (!taggedProfileId) {
      return NextResponse.json({ error: "tagged_profile_id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("adventure_tags")
      .delete()
      .eq("adventure_post_id", params.id)
      .eq("tagged_profile_id", taggedProfileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
