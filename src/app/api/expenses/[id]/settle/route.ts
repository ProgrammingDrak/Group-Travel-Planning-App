import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const settleSchema = z.object({
  participant_id: z.string().uuid(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const parsed = settleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { participant_id } = parsed.data;
    const supabase = createServerSupabaseClient();

    const { data: split, error } = await supabase
      .from("expense_splits")
      .update({
        is_settled: true,
        settled_at: new Date().toISOString(),
      })
      .eq("expense_id", id)
      .eq("participant_id", participant_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Expense split not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: split });
  } catch (error) {
    console.error("Error settling expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
