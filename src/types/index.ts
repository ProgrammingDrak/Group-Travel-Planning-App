export type CardType = 'activity' | 'restaurant' | 'event' | 'lodging' | 'rental';
export type CardStage = 'idea' | 'hot_contender' | 'chosen' | 'booked';
export type TransportMode = 'walk' | 'drive' | 'bike' | 'train' | 'bus' | 'boat' | 'plane' | 'other';
export type SplitType = 'equal' | 'custom_amount' | 'custom_percent';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  creator_email: string;
  invite_code: string;
  is_template: boolean;
  total_budget: number;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  trip_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_organizer: boolean;
  joined_at: string;
}

export interface Card {
  id: string;
  trip_id: string;
  type: CardType;
  title: string;
  description: string;
  date: string | null;
  start_time: string | null;
  duration_minutes: number;
  location: string;
  address: string;
  budget: number;
  category: string;
  stage: CardStage;
  is_date_locked: boolean;
  is_multi_day: boolean;
  end_date: string | null;
  images_urls: string[];
  created_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CardWithVoteStats extends Card {
  avg_score: number | null;
  vote_count: number;
  participant_count: number;
}

export interface CardParticipant {
  id: string;
  card_id: string;
  participant_id: string;
  is_participating: boolean;
}

export interface Vote {
  id: string;
  card_id: string;
  participant_id: string;
  score: number;
  is_anonymous: boolean;
  voted_at: string;
  participant?: Participant;
}

export interface Comment {
  id: string;
  card_id: string;
  participant_id: string;
  content: string;
  parent_comment_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  participant?: Participant;
  reactions?: CommentReaction[];
  replies?: Comment[];
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  participant_id: string;
  emoji: string;
  created_at: string;
}

export interface Expense {
  id: string;
  card_id: string;
  amount: number;
  paid_by_participant_id: string;
  split_type: SplitType;
  category: string;
  created_at: string;
  paid_by?: Participant;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  participant_id: string;
  amount_owed: number;
  is_settled: boolean;
  settled_at: string | null;
  participant?: Participant;
}

export interface TransportationOverride {
  id: string;
  card_id: string;
  from_card_id: string;
  mode: TransportMode;
  duration_minutes: number;
  notes: string;
}

export interface BudgetSummary {
  trip_id: string;
  category: string;
  total_spent: number;
}

export interface SettlementStatus {
  payer_id: string;
  payer_name: string;
  ower_id: string;
  ower_name: string;
  amount_owed: number;
  is_settled: boolean;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Participant session (stored in localStorage)
export interface ParticipantSession {
  participant_id: string;
  trip_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_organizer: boolean;
}
