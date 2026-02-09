"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Card, CardWithVoteStats, CardStage } from "@/types";

interface UseCardsOptions {
  tripId: string;
  stage?: CardStage | null;
  date?: string | null;
  participantId?: string | null;
}

export function useCards({ tripId, stage, date, participantId }: UseCardsOptions) {
  const [cards, setCards] = useState<CardWithVoteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch cards with vote stats
      let query = supabase
        .from("cards")
        .select(`
          *,
          votes(score),
          card_participants(participant_id, is_participating)
        `)
        .eq("trip_id", tripId)
        .order("date", { ascending: true, nullsFirst: false })
        .order("sort_order", { ascending: true });

      if (stage) {
        query = query.eq("stage", stage);
      }

      if (date) {
        query = query.eq("date", date);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Process cards to add vote stats
      const processed: CardWithVoteStats[] = (data || []).map((card) => {
        const votes = (card as Record<string, unknown>).votes as Array<{ score: number }> || [];
        const cardParticipants = (card as Record<string, unknown>).card_participants as Array<{ participant_id: string; is_participating: boolean }> || [];
        const totalScore = votes.reduce((sum: number, v: { score: number }) => sum + v.score, 0);
        const voteCount = votes.length;

        // Remove the nested relations from the card object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { votes: _v, card_participants: _cp, ...cardData } = card as Record<string, unknown>;

        return {
          ...cardData,
          avg_score: voteCount > 0 ? totalScore / voteCount : null,
          vote_count: voteCount,
          participant_count: cardParticipants.filter((cp) => cp.is_participating).length,
        } as CardWithVoteStats;
      });

      // Filter by participant if needed
      if (participantId) {
        const participatingCardIds = new Set(
          (data || [])
            .filter((card) => {
              const cps = (card as Record<string, unknown>).card_participants as Array<{ participant_id: string; is_participating: boolean }> || [];
              return cps.some(
                (cp) => cp.participant_id === participantId && cp.is_participating
              );
            })
            .map((card) => (card as { id: string }).id)
        );
        setCards(processed.filter((c) => participatingCardIds.has(c.id)));
      } else {
        setCards(processed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, [tripId, stage, date, participantId, supabase]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const createCard = useCallback(
    async (cardData: Partial<Card>) => {
      const { data, error: createError } = await supabase
        .from("cards")
        .insert({ ...cardData, trip_id: tripId })
        .select()
        .single();

      if (createError) throw createError;
      await fetchCards();
      return data;
    },
    [tripId, supabase, fetchCards]
  );

  const updateCard = useCallback(
    async (cardId: string, updates: Partial<Card>) => {
      const { data, error: updateError } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", cardId)
        .select()
        .single();

      if (updateError) throw updateError;
      await fetchCards();
      return data;
    },
    [supabase, fetchCards]
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      const { error: deleteError } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId);

      if (deleteError) throw deleteError;
      await fetchCards();
    },
    [supabase, fetchCards]
  );

  const reorderCards = useCallback(
    async (reorderedCards: { id: string; sort_order: number; date?: string | null }[]) => {
      // Optimistic update
      setCards((prev) => {
        const updated = [...prev];
        for (const rc of reorderedCards) {
          const idx = updated.findIndex((c) => c.id === rc.id);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              sort_order: rc.sort_order,
              ...(rc.date !== undefined ? { date: rc.date } : {}),
            };
          }
        }
        return updated.sort((a, b) => {
          if (a.date !== b.date) {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
          }
          return a.sort_order - b.sort_order;
        });
      });

      // Persist
      for (const rc of reorderedCards) {
        await supabase
          .from("cards")
          .update({ sort_order: rc.sort_order, ...(rc.date !== undefined ? { date: rc.date } : {}) })
          .eq("id", rc.id);
      }
    },
    [supabase]
  );

  return {
    cards,
    loading,
    error,
    refetch: fetchCards,
    createCard,
    updateCard,
    deleteCard,
    reorderCards,
  };
}
