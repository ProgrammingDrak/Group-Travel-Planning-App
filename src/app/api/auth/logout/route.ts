import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
