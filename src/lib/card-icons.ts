export type CardTypeKey =
  | "activity"
  | "restaurant"
  | "food"
  | "event"
  | "concert"
  | "outdoor"
  | "lodging"
  | "rental"
  | "flight"
  | "shopping"
  | "sightseeing"
  | "nightlife"
  | "spa"
  | "sports"
  | "museum"
  | "beach";

export interface CardTypeInfo {
  emoji: string;
  label: string;
  color: string;
}

export const CARD_TYPE_ICONS: Record<CardTypeKey, CardTypeInfo> = {
  activity:    { emoji: "🎯", label: "Activity",    color: "bg-blue-100 text-blue-700" },
  restaurant:  { emoji: "🍽️", label: "Restaurant",  color: "bg-orange-100 text-orange-700" },
  food:        { emoji: "🍕", label: "Food",        color: "bg-amber-100 text-amber-700" },
  event:       { emoji: "🎫", label: "Event",       color: "bg-purple-100 text-purple-700" },
  concert:     { emoji: "🎵", label: "Concert",     color: "bg-pink-100 text-pink-700" },
  outdoor:     { emoji: "🏕️", label: "Outdoor",     color: "bg-green-100 text-green-700" },
  lodging:     { emoji: "🏠", label: "Lodging",     color: "bg-indigo-100 text-indigo-700" },
  rental:      { emoji: "🚗", label: "Rental",      color: "bg-slate-100 text-slate-700" },
  flight:      { emoji: "✈️", label: "Flight",      color: "bg-sky-100 text-sky-700" },
  shopping:    { emoji: "🛍️", label: "Shopping",    color: "bg-fuchsia-100 text-fuchsia-700" },
  sightseeing: { emoji: "📸", label: "Sightseeing", color: "bg-teal-100 text-teal-700" },
  nightlife:   { emoji: "🌙", label: "Nightlife",   color: "bg-violet-100 text-violet-700" },
  spa:         { emoji: "💆", label: "Spa",         color: "bg-rose-100 text-rose-700" },
  sports:      { emoji: "⚽", label: "Sports",      color: "bg-emerald-100 text-emerald-700" },
  museum:      { emoji: "🏛️", label: "Museum",      color: "bg-stone-100 text-stone-700" },
  beach:       { emoji: "🏖️", label: "Beach",       color: "bg-cyan-100 text-cyan-700" },
};

export const TRANSPORT_MODE_ICONS: Record<string, { emoji: string; label: string }> = {
  walk:  { emoji: "🚶", label: "Walk" },
  drive: { emoji: "🚗", label: "Drive" },
  bike:  { emoji: "🚲", label: "Bike" },
  train: { emoji: "🚆", label: "Train" },
  bus:   { emoji: "🚌", label: "Bus" },
  boat:  { emoji: "⛴️", label: "Boat" },
  plane: { emoji: "✈️", label: "Plane" },
  uber:  { emoji: "🚕", label: "Uber" },
  taxi:  { emoji: "🚖", label: "Taxi" },
  other: { emoji: "🚐", label: "Other" },
};

export function getCardIcon(type: string, customIcon?: string | null): string {
  if (customIcon) return customIcon;
  const info = CARD_TYPE_ICONS[type as CardTypeKey];
  return info?.emoji ?? "🎯";
}

export function getCardTypeInfo(type: string): CardTypeInfo {
  return CARD_TYPE_ICONS[type as CardTypeKey] ?? CARD_TYPE_ICONS.activity;
}

/** Check if a card type is a non-activity (lodging, rental, flight) */
export function isAccommodationType(type: string): boolean {
  return type === "lodging" || type === "rental" || type === "flight";
}
