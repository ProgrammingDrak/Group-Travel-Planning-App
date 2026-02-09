import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { shiftDatesSchema } from "@/lib/validations";
import { addDays, differenceInDays, parseISO, format } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const parsed = shiftDatesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { new_start_date, new_end_date } = parsed.data;
    const supabase = createServerSupabaseClient();

    // Fetch the current trip to get old start_date
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("start_date, end_date")
      .eq("id", id)
      .single();

    if (tripError) {
      if (tripError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Trip not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: tripError.message },
        { status: 500 }
      );
    }

    // Calculate the day delta between old start and new start
    const oldStart = parseISO(trip.start_date);
    const newStart = parseISO(new_start_date);
    const dayDelta = differenceInDays(newStart, oldStart);

    // Update trip dates
    const { error: updateTripError } = await supabase
      .from("trips")
      .update({
        start_date: new_start_date,
        end_date: new_end_date,
      })
      .eq("id", id);

    if (updateTripError) {
      return NextResponse.json(
        { error: updateTripError.message },
        { status: 500 }
      );
    }

    // Fetch all cards for this trip where is_date_locked = false and date is not null
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, date, end_date, is_multi_day")
      .eq("trip_id", id)
      .eq("is_date_locked", false)
      .not("date", "is", null);

    if (cardsError) {
      return NextResponse.json(
        { error: cardsError.message },
        { status: 500 }
      );
    }

    let updatedCount = 0;

    if (cards && cards.length > 0) {
      for (const card of cards) {
        const newCardDate = format(
          addDays(parseISO(card.date!), dayDelta),
          "yyyy-MM-dd"
        );

        const updatePayload: { date: string; end_date?: string } = {
          date: newCardDate,
        };

        // Also shift end_date for multi-day cards
        if (card.is_multi_day && card.end_date) {
          updatePayload.end_date = format(
            addDays(parseISO(card.end_date), dayDelta),
            "yyyy-MM-dd"
          );
        }

        const { error: updateCardError } = await supabase
          .from("cards")
          .update(updatePayload)
          .eq("id", card.id);

        if (!updateCardError) {
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      data: {
        updated_cards_count: updatedCount,
        day_delta: dayDelta,
        new_start_date,
        new_end_date,
      },
    });
  } catch (error) {
    console.error("Error shifting dates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
