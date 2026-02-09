"use client";

import { createContext, useContext } from "react";
import type { ParticipantSession } from "@/types";

export interface ParticipantContextType {
  participant: ParticipantSession | null;
  setParticipant: (p: ParticipantSession | null) => void;
  isOrganizer: boolean;
}

export const ParticipantContext = createContext<ParticipantContextType>({
  participant: null,
  setParticipant: () => {},
  isOrganizer: false,
});

export function useParticipant() {
  return useContext(ParticipantContext);
}

const STORAGE_KEY = "tripsync_participant";

export function getStoredParticipant(tripId: string): ParticipantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${tripId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function storeParticipant(session: ParticipantSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}_${session.trip_id}`, JSON.stringify(session));
}

export function clearStoredParticipant(tripId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEY}_${tripId}`);
}
