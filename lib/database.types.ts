// Database Types for Goal Accountability App
// Generated types matching Supabase schema

export type GoalType = 
  | 'canvas_grade'
  | 'homework_assignment'
  | 'sat_score'
  | 'mcat_score'
  | 'college_board_exam'
  | 'custom';

export type GoalStatus = 
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TransactionType = 
  | 'stake'
  | 'penalty'
  | 'reward'
  | 'refund'
  | 'payout';

export type VerificationType = 
  | 'photo'
  | 'document'
  | 'api'
  | 'manual';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  wallet_balance: number;
  total_earned: number;
  total_lost: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal_type: GoalType;
  target_value: string;
  current_value: string | null;
  deadline: string;
  stake_amount: number;
  status: GoalStatus;
  verification_method: string | null;
  verification_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface GoalCollaboration {
  id: string;
  goal_id: string;
  collaborator_id: string;
  stake_amount: number;
  will_earn_if_fails: boolean;
  created_at: string;
}

export interface AlarmClock {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  alarm_time: string; // Time format HH:MM:SS
  timezone: string;
  code: string;
  stake_amount: number;
  is_active: boolean;
  last_triggered: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlarmLog {
  id: string;
  alarm_id: string;
  user_id: string;
  entered_at: string | null;
  code_entered: string | null;
  was_successful: boolean;
  penalty_applied: number;
  created_at: string;
}

export interface Verification {
  id: string;
  goal_id: string;
  user_id: string;
  verification_type: VerificationType;
  verification_data: Record<string, any> | null;
  verified_value: string | null;
  is_approved: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  reward_amount: number;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  related_entity_type: string | null;
  related_entity_id: string | null;
  description: string | null;
  balance_before: number | null;
  balance_after: number | null;
  created_at: string;
}

// Helper types for creating/updating
export type GoalInsert = Omit<Goal, 'id' | 'created_at' | 'updated_at'>;
export type GoalUpdate = Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type AlarmClockInsert = Omit<AlarmClock, 'id' | 'created_at' | 'updated_at' | 'last_triggered'>;
export type AlarmClockUpdate = Partial<Omit<AlarmClock, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_completed' | 'completed_at'>;
export type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

