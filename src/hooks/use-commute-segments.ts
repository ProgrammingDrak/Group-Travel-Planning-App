"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  CommuteSegment,
  CommuteOption,
  CommuteOptionParticipant,
  TransportMode,
} from "@/types";

export function useCommuteSegments(tripId: string) {
  const [segments, setSegments] = useState<CommuteSegment[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);

      // Get all card IDs belonging to this trip
      const { data: cards, error: cardsError } = await supabase
        .from("cards")
        .select("id")
        .eq("trip_id", tripId);

      if (cardsError) throw cardsError;

      const cardIds = (cards || []).map((c: { id: string }) => c.id);

      if (cardIds.length === 0) {
        setSegments([]);
        return;
      }

      // Fetch commute segments where from_card_id is in this trip's cards,
      // including nested options and their participants
      const { data, error: segError } = await supabase
        .from("commute_segments")
        .select(
          `
          *,
          options:commute_options(
            *,
            participants:commute_option_participants(
              *,
              participant:participants(*)
            )
          )
        `
        )
        .in("from_card_id", cardIds);

      if (segError) throw segError;

      setSegments((data as CommuteSegment[]) || []);
    } catch (err) {
      console.error("Failed to fetch commute segments:", err);
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, [tripId, supabase]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  /**
   * Creates a new commute segment between two cards, or updates the existing
   * one if a segment already exists for that card pair.
   */
  const createOrUpdateSegment = useCallback(
    async (
      fromCardId: string,
      toCardId: string,
      breakMinutes: number = 0
    ): Promise<CommuteSegment | null> => {
      // Check if a segment already exists for this pair
      const existing = segments.find(
        (s) => s.from_card_id === fromCardId && s.to_card_id === toCardId
      );

      if (existing) {
        const { data, error } = await supabase
          .from("commute_segments")
          .update({ break_minutes: breakMinutes })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        await fetchSegments();
        return data as CommuteSegment;
      }

      const { data, error } = await supabase
        .from("commute_segments")
        .insert({
          from_card_id: fromCardId,
          to_card_id: toCardId,
          break_minutes: breakMinutes,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSegments();
      return data as CommuteSegment;
    },
    [segments, supabase, fetchSegments]
  );

  /**
   * Adds a commute option to a segment.
   */
  const addOption = useCallback(
    async (
      segmentId: string,
      mode: TransportMode,
      durationMinutes: number,
      opts?: {
        label?: string;
        cost?: number;
        notes?: string;
        confirmationNumber?: string;
        attachmentUrls?: string[];
        detailFields?: Record<string, string>;
      }
    ): Promise<CommuteOption | null> => {
      // Determine next sort_order
      const segment = segments.find((s) => s.id === segmentId);
      const maxOrder =
        segment?.options?.reduce(
          (max, o) => Math.max(max, o.sort_order),
          -1
        ) ?? -1;

      const { data, error } = await supabase
        .from("commute_options")
        .insert({
          segment_id: segmentId,
          mode,
          duration_minutes: durationMinutes,
          label: opts?.label ?? "",
          cost: opts?.cost ?? 0,
          notes: opts?.notes ?? "",
          confirmation_number: opts?.confirmationNumber ?? "",
          attachment_urls: opts?.attachmentUrls ?? [],
          detail_fields: opts?.detailFields ?? {},
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSegments();
      return data as CommuteOption;
    },
    [segments, supabase, fetchSegments]
  );

  /**
   * Updates an existing commute option.
   */
  const updateOption = useCallback(
    async (
      optionId: string,
      updates: Partial<
        Pick<
          CommuteOption,
          | "mode"
          | "label"
          | "duration_minutes"
          | "cost"
          | "notes"
          | "confirmation_number"
          | "attachment_urls"
          | "detail_fields"
          | "sort_order"
        >
      >
    ): Promise<CommuteOption | null> => {
      const { data, error } = await supabase
        .from("commute_options")
        .update(updates)
        .eq("id", optionId)
        .select()
        .single();

      if (error) throw error;
      await fetchSegments();
      return data as CommuteOption;
    },
    [supabase, fetchSegments]
  );

  /**
   * Deletes a commute option.
   */
  const deleteOption = useCallback(
    async (optionId: string): Promise<void> => {
      const { error } = await supabase
        .from("commute_options")
        .delete()
        .eq("id", optionId);

      if (error) throw error;
      await fetchSegments();
    },
    [supabase, fetchSegments]
  );

  /**
   * Assigns a participant to a commute option.
   */
  const assignParticipant = useCallback(
    async (
      optionId: string,
      participantId: string
    ): Promise<CommuteOptionParticipant | null> => {
      const { data, error } = await supabase
        .from("commute_option_participants")
        .insert({
          commute_option_id: optionId,
          participant_id: participantId,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSegments();
      return data as CommuteOptionParticipant;
    },
    [supabase, fetchSegments]
  );

  /**
   * Removes a participant from a commute option.
   */
  const removeParticipant = useCallback(
    async (optionId: string, participantId: string): Promise<void> => {
      const { error } = await supabase
        .from("commute_option_participants")
        .delete()
        .eq("commute_option_id", optionId)
        .eq("participant_id", participantId);

      if (error) throw error;
      await fetchSegments();
    },
    [supabase, fetchSegments]
  );

  /**
   * Updates the break time on a commute segment.
   */
  const updateBreakTime = useCallback(
    async (segmentId: string, breakMinutes: number): Promise<void> => {
      const { error } = await supabase
        .from("commute_segments")
        .update({ break_minutes: breakMinutes })
        .eq("id", segmentId);

      if (error) throw error;
      await fetchSegments();
    },
    [supabase, fetchSegments]
  );

  return {
    segments,
    loading,
    createOrUpdateSegment,
    addOption,
    updateOption,
    deleteOption,
    assignParticipant,
    removeParticipant,
    updateBreakTime,
  };
}
