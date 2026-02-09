"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeOptions {
  tripId: string;
  onCardsChange?: () => void;
  onVotesChange?: () => void;
  onCommentsChange?: () => void;
  onParticipantsChange?: () => void;
}

export function useRealtime({
  tripId,
  onCardsChange,
  onVotesChange,
  onCommentsChange,
  onParticipantsChange,
}: UseRealtimeOptions) {
  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    // Subscribe to cards changes
    if (onCardsChange) {
      const cardsChannel = supabase
        .channel(`cards:trip_id=eq.${tripId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cards",
            filter: `trip_id=eq.${tripId}`,
          },
          () => {
            onCardsChange();
          }
        )
        .subscribe();
      channels.push(cardsChannel);
    }

    // Subscribe to votes changes
    if (onVotesChange) {
      const votesChannel = supabase
        .channel(`votes:trip=${tripId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "votes",
          },
          () => {
            onVotesChange();
          }
        )
        .subscribe();
      channels.push(votesChannel);
    }

    // Subscribe to comments changes
    if (onCommentsChange) {
      const commentsChannel = supabase
        .channel(`comments:trip=${tripId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comments",
          },
          () => {
            onCommentsChange();
          }
        )
        .subscribe();
      channels.push(commentsChannel);
    }

    // Subscribe to participants changes
    if (onParticipantsChange) {
      const participantsChannel = supabase
        .channel(`participants:trip_id=eq.${tripId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "participants",
            filter: `trip_id=eq.${tripId}`,
          },
          () => {
            onParticipantsChange();
          }
        )
        .subscribe();
      channels.push(participantsChannel);
    }

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [tripId, onCardsChange, onVotesChange, onCommentsChange, onParticipantsChange]);
}

// Presence hook for "X is viewing this card"
export function usePresence(tripId: string, participantId: string, cardId?: string) {
  useEffect(() => {
    if (!participantId) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence:${tripId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        // Presence state synced
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            participant_id: participantId,
            viewing_card: cardId || null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, participantId, cardId]);
}
