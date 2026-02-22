import type { CardWithVoteStats, CommuteSegment } from "@/types";

/**
 * Adds minutes to a time string in HH:MM format.
 * Wraps around at 24:00 (midnight).
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440; // handle negatives & wrap at 24h
  const newHours = Math.floor(wrapped / 60);
  const newMins = wrapped % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
}

/**
 * Calculates end time from a start time and a duration in minutes.
 * Returns null if startTime is null.
 */
export function getEndTime(
  startTime: string | null,
  durationMinutes: number
): string | null {
  if (!startTime) return null;
  return addMinutesToTime(startTime, durationMinutes);
}

/**
 * Walks an ordered array of cards and recalculates start times sequentially.
 *
 * For each card after the first, the start time is set to:
 *   endTimeOfPrevious + commuteTime + breakTime
 *
 * The commute time and break time are looked up from the matching commute
 * segment between consecutive card pairs. If no segment exists, the
 * defaultCommuteMinutes value is used (with 0 break time).
 *
 * The first card keeps its existing start_time. If the first card has no
 * start_time, "09:00" is used as a fallback so downstream cards can still
 * be calculated.
 */
export function recalculateStartTimes(
  orderedCards: CardWithVoteStats[],
  commuteSegments: CommuteSegment[],
  defaultCommuteMinutes: number = 15
): { id: string; start_time: string }[] {
  if (orderedCards.length === 0) return [];

  // Build a lookup map for segments keyed by "fromCardId->toCardId"
  const segmentMap = new Map<string, CommuteSegment>();
  for (const seg of commuteSegments) {
    segmentMap.set(`${seg.from_card_id}->${seg.to_card_id}`, seg);
  }

  const results: { id: string; start_time: string }[] = [];

  // First card retains its start time (fallback to 09:00)
  const firstStart = orderedCards[0].start_time ?? "09:00";
  results.push({ id: orderedCards[0].id, start_time: firstStart });

  for (let i = 1; i < orderedCards.length; i++) {
    const prevCard = orderedCards[i - 1];
    const currentCard = orderedCards[i];

    // Determine the previous card's effective start time
    const prevStart = results[i - 1].start_time;
    const prevDuration = prevCard.duration_minutes || 0;

    // Calculate the end time of the previous card
    const prevEndTime = addMinutesToTime(prevStart, prevDuration);

    // Look up commute segment between previous and current card
    const segment = segmentMap.get(`${prevCard.id}->${currentCard.id}`);

    // Determine commute duration from the segment's first option, or fallback
    let commuteDuration = defaultCommuteMinutes;
    if (segment && segment.options && segment.options.length > 0) {
      commuteDuration = segment.options[0].duration_minutes;
    }

    const breakTime = segment ? segment.break_minutes : 0;

    // New start time = previous end + commute + break
    const newStartTime = addMinutesToTime(
      prevEndTime,
      commuteDuration + breakTime
    );

    results.push({ id: currentCard.id, start_time: newStartTime });
  }

  return results;
}

/**
 * Formats a number of minutes into a human-readable string.
 *
 * Examples:
 *   0   -> "0m"
 *   45  -> "45m"
 *   60  -> "1h"
 *   90  -> "1h 30m"
 *   135 -> "2h 15m"
 */
export function formatMinutesAsTime(minutes: number): string {
  if (minutes < 0) minutes = 0;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
