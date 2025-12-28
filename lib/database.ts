// Database helper functions for Goal Accountability App
import type {
    AlarmClock,
    AlarmClockInsert,
    AlarmClockUpdate,
    Friendship,
    Goal,
    GoalCollaboration,
    GoalInsert,
    GoalUpdate,
    Profile,
    Task,
    TaskInsert,
    Transaction,
    Verification
} from './database.types';
import { supabase } from './supabase';

// Profile Functions
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Goal Functions
export async function createGoal(goal: GoalInsert): Promise<Goal> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('goals')
    .insert(goal)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGoals(userId: string, status?: string): Promise<Goal[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  let query = supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getGoal(goalId: string): Promise<Goal | null> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateGoal(goalId: string, updates: GoalUpdate): Promise<Goal> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Alarm Clock Functions
export async function createAlarmClock(alarm: AlarmClockInsert): Promise<AlarmClock> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('alarm_clocks')
    .insert(alarm)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAlarmClocks(userId: string, activeOnly = false): Promise<AlarmClock[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  let query = supabase
    .from('alarm_clocks')
    .select('*')
    .eq('user_id', userId)
    .order('alarm_time', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateAlarmClock(alarmId: string, updates: AlarmClockUpdate): Promise<AlarmClock> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('alarm_clocks')
    .update(updates)
    .eq('id', alarmId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Task Functions
export async function createTask(task: TaskInsert): Promise<Task> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTasks(userId: string, completed?: boolean): Promise<Task[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (completed !== undefined) {
    query = query.eq('is_completed', completed);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function completeTask(taskId: string): Promise<Task> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      is_completed: true, 
      completed_at: new Date().toISOString() 
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Transaction Functions
export async function getTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Friendship Functions
export async function getFriendships(userId: string): Promise<Friendship[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) throw error;
  return data || [];
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<Friendship> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Goal Collaboration Functions
export async function createGoalCollaboration(
  goalId: string,
  collaboratorId: string,
  stakeAmount: number,
  willEarnIfFails = true
): Promise<GoalCollaboration> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('goal_collaborations')
    .insert({
      goal_id: goalId,
      collaborator_id: collaboratorId,
      stake_amount: stakeAmount,
      will_earn_if_fails: willEarnIfFails,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGoalCollaborations(goalId: string): Promise<GoalCollaboration[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('goal_collaborations')
    .select('*')
    .eq('goal_id', goalId);

  if (error) throw error;
  return data || [];
}

// Verification Functions
export async function createVerification(
  goalId: string,
  userId: string,
  verificationType: string,
  verificationData: Record<string, any>,
  verifiedValue: string
): Promise<Verification> {
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { data, error } = await supabase
    .from('verifications')
    .insert({
      goal_id: goalId,
      user_id: userId,
      verification_type: verificationType,
      verification_data: verificationData,
      verified_value: verifiedValue,
      is_approved: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper function to stake money on a goal
export async function stakeOnGoal(userId: string, goalId: string, amount: number): Promise<void> {
  // Get current balance
  const profile = await getProfile(userId);
  if (!profile) throw new Error('Profile not found');
  
  if (profile.wallet_balance < amount) {
    throw new Error('Insufficient funds');
  }

  // Update wallet balance
  const newBalance = profile.wallet_balance - amount;
  await updateProfile(userId, { wallet_balance: newBalance });

  // Create transaction record
  if (!supabase) throw new Error('Supabase is not configured');
  
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      transaction_type: 'stake',
      related_entity_type: 'goal',
      related_entity_id: goalId,
      description: `Staked $${amount} on goal`,
      balance_before: profile.wallet_balance,
      balance_after: newBalance,
    });

  if (txError) throw txError;
}

