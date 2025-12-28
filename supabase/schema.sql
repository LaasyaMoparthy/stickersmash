-- Goal Accountability App Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  total_earned DECIMAL(10, 2) DEFAULT 0.00,
  total_lost DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal Types Enum
CREATE TYPE goal_type AS ENUM (
  'canvas_grade',
  'homework_assignment',
  'sat_score',
  'mcat_score',
  'college_board_exam',
  'custom'
);

-- Goal Status Enum
CREATE TYPE goal_status AS ENUM (
  'active',
  'completed',
  'failed',
  'cancelled'
);

-- Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type goal_type NOT NULL,
  target_value TEXT NOT NULL, -- Can be grade, score, etc.
  current_value TEXT, -- Current progress
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  stake_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status goal_status DEFAULT 'active',
  verification_method TEXT, -- How to verify (e.g., 'manual_upload', 'api', 'photo')
  verification_data JSONB, -- Additional verification info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friends/Collaborations Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Goal Collaborations (Friends betting on your goals)
CREATE TABLE IF NOT EXISTS public.goal_collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stake_amount DECIMAL(10, 2) NOT NULL,
  will_earn_if_fails BOOLEAN DEFAULT true, -- If true, collaborator earns if goal fails
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, collaborator_id)
);

-- Alarm Clocks Table
CREATE TABLE IF NOT EXISTS public.alarm_clocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL, -- Optional link to goal
  title TEXT NOT NULL,
  alarm_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  code TEXT NOT NULL, -- Code user must enter
  stake_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alarm Clock Logs (Track when codes were entered/missed)
CREATE TABLE IF NOT EXISTS public.alarm_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alarm_id UUID NOT NULL REFERENCES public.alarm_clocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entered_at TIMESTAMP WITH TIME ZONE,
  code_entered TEXT,
  was_successful BOOLEAN DEFAULT false,
  penalty_applied DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification Records (Proof that goals were achieved)
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'photo', 'document', 'api', 'manual'
  verification_data JSONB, -- File URLs, API responses, etc.
  verified_value TEXT, -- The actual achieved value
  is_approved BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES public.profiles(id), -- Admin/mod reviewer
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks (For earning money back)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL, -- Optional link to goal
  title TEXT NOT NULL,
  description TEXT,
  reward_amount DECIMAL(10, 2) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions (Track all money movements)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type TEXT NOT NULL, -- 'stake', 'penalty', 'reward', 'refund', 'payout'
  related_entity_type TEXT, -- 'goal', 'alarm', 'task', 'collaboration'
  related_entity_id UUID, -- ID of related goal, alarm, etc.
  description TEXT,
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_goal_collaborations_goal_id ON public.goal_collaborations(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_collaborations_collaborator_id ON public.goal_collaborations(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_alarm_clocks_user_id ON public.alarm_clocks(user_id);
CREATE INDEX IF NOT EXISTS idx_alarm_clocks_is_active ON public.alarm_clocks(is_active);
CREATE INDEX IF NOT EXISTS idx_verifications_goal_id ON public.verifications(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_clocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Goals Policies
CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view goals they collaborate on"
  ON public.goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goal_collaborations
      WHERE goal_id = goals.id AND collaborator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Friendships Policies
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Goal Collaborations Policies
CREATE POLICY "Users can view collaborations on their goals"
  ON public.goal_collaborations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = goal_collaborations.goal_id AND goals.user_id = auth.uid()
    ) OR collaborator_id = auth.uid()
  );

CREATE POLICY "Users can create collaborations"
  ON public.goal_collaborations FOR INSERT
  WITH CHECK (auth.uid() = collaborator_id);

-- Alarm Clocks Policies
CREATE POLICY "Users can view their own alarms"
  ON public.alarm_clocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alarms"
  ON public.alarm_clocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alarms"
  ON public.alarm_clocks FOR UPDATE
  USING (auth.uid() = user_id);

-- Alarm Logs Policies
CREATE POLICY "Users can view their alarm logs"
  ON public.alarm_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their alarm logs"
  ON public.alarm_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verifications Policies
CREATE POLICY "Users can view verifications for their goals"
  ON public.verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = verifications.goal_id AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create verifications for their goals"
  ON public.verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = verifications.goal_id AND goals.user_id = auth.uid()
    )
  );

-- Tasks Policies
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alarm_clocks_updated_at BEFORE UPDATE ON public.alarm_clocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

