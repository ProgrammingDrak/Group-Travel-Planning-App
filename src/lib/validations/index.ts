import { z } from "zod";

const allCardTypes = [
  "activity", "restaurant", "food", "event", "concert",
  "outdoor", "lodging", "rental", "flight", "shopping",
  "sightseeing", "nightlife", "spa", "sports", "museum", "beach",
] as const;

const allTransportModes = [
  "walk", "drive", "bike", "train", "bus", "boat", "plane", "uber", "taxi", "other",
] as const;

export const createTripSchema = z.object({
  name: z.string().min(1, "Trip name is required").max(100),
  destination: z.string().min(1, "Destination is required").max(200),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  creator_email: z.string().email("Valid email is required"),
  total_budget: z.coerce.number().min(0).default(0),
});

export const updateTripSchema = createTripSchema.partial();

export const joinTripSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Valid email is required"),
});

export const createCardSchema = z.object({
  trip_id: z.string().uuid(),
  type: z.enum(allCardTypes).default("activity"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).default(""),
  date: z.string().nullable().default(null),
  start_time: z.string().nullable().default(null),
  duration_minutes: z.coerce.number().min(0).default(60),
  location: z.string().max(200).default(""),
  address: z.string().max(500).default(""),
  budget: z.coerce.number().min(0).default(0),
  category: z.string().max(100).default(""),
  stage: z.enum(["idea", "hot_contender", "chosen", "booked"]).default("idea"),
  is_date_locked: z.boolean().default(false),
  is_multi_day: z.boolean().default(false),
  end_date: z.string().nullable().default(null),
  icon: z.string().max(10).nullable().default(null),
  available_dates: z.array(z.string()).optional(),
  created_by: z.string().uuid().nullable().default(null),
  sort_order: z.coerce.number().default(0),
});

export const updateCardSchema = createCardSchema.partial().omit({ trip_id: true });

export const createVoteSchema = z.object({
  card_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  score: z.coerce.number().min(1).max(3),
  is_anonymous: z.boolean().default(false),
});

export const createCommentSchema = z.object({
  card_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  parent_comment_id: z.string().uuid().nullable().default(null),
});

export const addReactionSchema = z.object({
  comment_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  emoji: z.string().min(1).max(10),
});

export const createExpenseSchema = z.object({
  card_id: z.string().uuid(),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  paid_by_participant_id: z.string().uuid(),
  split_type: z.enum(["equal", "custom_amount", "custom_percent"]).default("equal"),
  category: z.string().max(100).default(""),
  splits: z.array(z.object({
    participant_id: z.string().uuid(),
    amount_owed: z.coerce.number().min(0),
  })).optional(),
  line_items: z.array(z.object({
    description: z.string().max(200),
    amount: z.coerce.number().min(0),
    item_type: z.enum(["per_person", "communal"]).default("communal"),
  })).optional(),
  participant_ids: z.array(z.string().uuid()).optional(),
});

export const shiftDatesSchema = z.object({
  new_start_date: z.string().min(1, "New start date is required"),
  new_end_date: z.string().min(1, "New end date is required"),
});

export const moveCardSchema = z.object({
  date: z.string().nullable(),
  sort_order: z.coerce.number(),
});

export const transportOverrideSchema = z.object({
  card_id: z.string().uuid(),
  from_card_id: z.string().uuid(),
  mode: z.enum(allTransportModes).default("drive"),
  duration_minutes: z.coerce.number().min(0).default(15),
  notes: z.string().max(500).default(""),
});

// Commute segments (Rev 2, 3)
export const createCommuteSegmentSchema = z.object({
  from_card_id: z.string().uuid(),
  to_card_id: z.string().uuid(),
  break_minutes: z.coerce.number().min(0).default(0),
});

export const createCommuteOptionSchema = z.object({
  segment_id: z.string().uuid(),
  mode: z.enum(allTransportModes).default("drive"),
  label: z.string().max(100).default(""),
  duration_minutes: z.coerce.number().min(0).default(15),
  cost: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).default(""),
  confirmation_number: z.string().max(100).default(""),
  detail_fields: z.record(z.string(), z.string()).default({}),
});

export const updateCommuteOptionSchema = createCommuteOptionSchema.partial().omit({ segment_id: true });

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type JoinTripInput = z.infer<typeof joinTripSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type CreateVoteInput = z.infer<typeof createVoteSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ShiftDatesInput = z.infer<typeof shiftDatesSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type CreateCommuteSegmentInput = z.infer<typeof createCommuteSegmentSchema>;
export type CreateCommuteOptionInput = z.infer<typeof createCommuteOptionSchema>;
