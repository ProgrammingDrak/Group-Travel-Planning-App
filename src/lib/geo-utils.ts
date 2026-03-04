import type { CardWithVoteStats } from "@/types";

/**
 * Haversine formula to calculate distance between two lat/lng points.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function milesToKm(miles: number): number {
  return miles / 0.621371;
}

export interface LocationGroup {
  id: string;
  label: string;
  centroidLat: number;
  centroidLng: number;
  cards: CardWithVoteStats[];
  radiusKm: number;
}

/**
 * Groups cards by geographic proximity using greedy centroid clustering.
 *
 * For each geocoded card, find the nearest existing group centroid.
 * If within threshold, add to that group and recompute centroid.
 * Otherwise, create a new group.
 * Cards without lat/lng go into a "No Location Set" group.
 */
export function groupCardsByProximity(
  cards: CardWithVoteStats[],
  thresholdKm: number = 40
): LocationGroup[] {
  const geocoded = cards.filter((c) => c.lat != null && c.lng != null);
  const ungeocodedCards = cards.filter((c) => c.lat == null || c.lng == null);

  const groups: LocationGroup[] = [];

  for (const card of geocoded) {
    let bestGroup: LocationGroup | null = null;
    let bestDistance = Infinity;

    for (const group of groups) {
      const dist = haversineDistance(
        card.lat!,
        card.lng!,
        group.centroidLat,
        group.centroidLng
      );
      if (dist < bestDistance) {
        bestDistance = dist;
        bestGroup = group;
      }
    }

    if (bestGroup && bestDistance < thresholdKm) {
      bestGroup.cards.push(card);
      // Recompute centroid
      const n = bestGroup.cards.length;
      bestGroup.centroidLat =
        bestGroup.cards.reduce((sum, c) => sum + c.lat!, 0) / n;
      bestGroup.centroidLng =
        bestGroup.cards.reduce((sum, c) => sum + c.lng!, 0) / n;
      bestGroup.radiusKm = Math.max(bestGroup.radiusKm, bestDistance);
    } else {
      groups.push({
        id: `group-${groups.length}`,
        label: card.location || "Unknown Area",
        centroidLat: card.lat!,
        centroidLng: card.lng!,
        cards: [card],
        radiusKm: 0,
      });
    }
  }

  // Improve labels: use the most common location name
  for (const group of groups) {
    if (group.cards.length > 1) {
      const locationCounts = new Map<string, number>();
      for (const c of group.cards) {
        if (c.location) {
          locationCounts.set(
            c.location,
            (locationCounts.get(c.location) || 0) + 1
          );
        }
      }
      let bestLabel = group.label;
      let bestCount = 0;
      locationCounts.forEach((count, loc) => {
        if (count > bestCount) {
          bestCount = count;
          bestLabel = loc;
        }
      });
      group.label = `${bestLabel} area`;
    }
  }

  // Add ungecoded cards as a special group
  if (ungeocodedCards.length > 0) {
    groups.push({
      id: "group-no-location",
      label: "No Location Set",
      centroidLat: 0,
      centroidLng: 0,
      cards: ungeocodedCards,
      radiusKm: 0,
    });
  }

  return groups;
}
