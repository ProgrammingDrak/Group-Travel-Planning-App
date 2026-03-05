import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, username, display_name } = parsed.data;

    // Check if username is already taken
    const serviceClient = createServiceRoleClient();
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Create auth user
    const supabase = createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Create profile using service role (bypasses RLS)
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .insert({
        id: authData.user.id,
        username,
        display_name,
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { user: authData.user, profile } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
