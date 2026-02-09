import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createExpenseSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { card_id, amount, paid_by_participant_id, split_type, category, splits } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Insert the expense
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        card_id,
        amount,
        paid_by_participant_id,
        split_type,
        category,
      })
      .select()
      .single();

    if (expenseError) {
      return NextResponse.json(
        { error: expenseError.message },
        { status: 500 }
      );
    }

    let createdSplits = null;

    if (split_type === "equal") {
      // Auto-create equal splits for all card participants
      const { data: cardParticipants, error: cpError } = await supabase
        .from("card_participants")
        .select("participant_id")
        .eq("card_id", card_id)
        .eq("is_participating", true);

      if (cpError) {
        return NextResponse.json(
          { error: cpError.message },
          { status: 500 }
        );
      }

      if (cardParticipants && cardParticipants.length > 0) {
        const equalAmount = Math.round((amount / cardParticipants.length) * 100) / 100;

        const splitRows = cardParticipants.map((cp) => ({
          expense_id: expense.id,
          participant_id: cp.participant_id,
          amount_owed: equalAmount,
        }));

        const { data: insertedSplits, error: splitsError } = await supabase
          .from("expense_splits")
          .insert(splitRows)
          .select();

        if (splitsError) {
          return NextResponse.json(
            { error: splitsError.message },
            { status: 500 }
          );
        }

        createdSplits = insertedSplits;
      }
    } else if (splits && splits.length > 0) {
      // Insert custom splits provided in the request
      const splitRows = splits.map((s) => ({
        expense_id: expense.id,
        participant_id: s.participant_id,
        amount_owed: s.amount_owed,
      }));

      const { data: insertedSplits, error: splitsError } = await supabase
        .from("expense_splits")
        .insert(splitRows)
        .select();

      if (splitsError) {
        return NextResponse.json(
          { error: splitsError.message },
          { status: 500 }
        );
      }

      createdSplits = insertedSplits;
    }

    return NextResponse.json(
      { data: { ...expense, splits: createdSplits } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
