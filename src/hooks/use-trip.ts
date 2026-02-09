"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip, Participant } from "@/types";

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTrip = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (tripError) throw tripError;
      setTrip(data);

      const { data: participantsData, error: partError } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", tripId)
        .order("joined_at", { ascending: true });

      if (partError) throw partError;
      setParticipants(participantsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [tripId, supabase]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const updateTrip = useCallback(
    async (updates: Partial<Trip>) => {
      const { data, error: updateError } = await supabase
        .from("trips")
        .update(updates)
        .eq("id", tripId)
        .select()
        .single();

      if (updateError) throw updateError;
      setTrip(data);
      return data;
    },
    [tripId, supabase]
  );

  return {
    trip,
    participants,
    loading,
    error,
    refetch: fetchTrip,
    updateTrip,
  };
}
