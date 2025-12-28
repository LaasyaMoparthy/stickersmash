-- Drop and Recreate All Tables for GoalStakes App
-- WARNING: This will delete all existing data!
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: DROP ALL TABLES (in reverse dependency order)
-- ============================================

-- Drop dependent tables first
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.verifications CASCADE;
DROP TABLE IF EXISTS public.alarm_logs CASCADE;
DROP TABLE IF EXISTS public.alarm_clocks CASCADE;
DROP TABLE IF EXISTS public.goal_collaborations CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.locked_apps CASCADE;
DROP TABLE IF EXISTS public.app_usage_logs CASCADE;
DROP TABLE IF EXISTS public.screen_time_limits CASCADE;
DROP TABLE IF EXISTS public.screen_time_logs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop types/enums
DROP TYPE IF EXISTS goal_type CASCADE;
DROP TYPE IF EXISTS goal_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS verification_type CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ============================================
-- STEP 2: CREATE EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 3: CREATE ENUMS/TYPES
-- ============================================

CREATE TYPE goal_type AS ENUM (
  'canvas_grade',
  'homework_assignment',
  'sat_score',
  'mcat_score',
  'college_board_exam',
  'custom'
);

CREATE TYPE goal_status AS ENUM (
  'active',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE transaction_type AS ENUM (
  'stake',
  'penalty',
  'reward',
  'refund',
  'payout',
  'screen_time_penalty'
);

CREATE TYPE verification_type AS ENUM (
  'photo',
  'document',
  'api',
  'manual'
);

-- ============================================
-- STEP 4: CREATE TABLES
-- ============================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
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

-- Screen Time Limits (NEW - for screen time tracking)
CREATE TABLE public.screen_time_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_limit_minutes INTEGER NOT NULL DEFAULT 120, -- Default 2 hours
  penalty_amount DECIMAL(10, 2) NOT NULL DEFAULT 50.00, -- Default $50
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One limit per user
);

-- Screen Time Logs (NEW - track daily usage)
CREATE TABLE public.screen_time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_used INTEGER NOT NULL DEFAULT 0,
  limit_exceeded BOOLEAN DEFAULT false,
  penalty_applied DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- One log per user per day
);

-- Locked Apps (NEW - apps that users want to lock)
CREATE TABLE public.locked_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL, -- Display name (e.g., "Instagram")
  app_package TEXT NOT NULL, -- Package/bundle ID (e.g., "com.instagram.android")
  app_icon_url TEXT, -- URL or path to app icon
  is_locked BOOLEAN DEFAULT true,
  unlock_code TEXT, -- Optional code to unlock (if user wants to unlock temporarily)
  penalty_amount DECIMAL(10, 2) DEFAULT 0.00, -- Penalty if app is accessed while locked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, app_package) -- One entry per app per user
);

-- App Usage Logs (NEW - track when locked apps are accessed)
CREATE TABLE public.app_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  locked_app_id UUID NOT NULL REFERENCES public.locked_apps(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  was_locked BOOLEAN DEFAULT true,
  penalty_applied DECIMAL(10, 2) DEFAULT 0.00,
  unlock_method TEXT, -- 'code', 'time_limit', 'manual', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals Table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type goal_type NOT NULL,
  target_value TEXT NOT NULL,
  current_value TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  stake_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status goal_status DEFAULT 'active',
  verification_method TEXT,
  verification_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friendships Table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Goal Collaborations Table
CREATE TABLE public.goal_collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stake_amount DECIMAL(10, 2) NOT NULL,
  will_earn_if_fails BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, collaborator_id)
);

-- Alarm Clocks Table
CREATE TABLE public.alarm_clocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  alarm_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  code TEXT NOT NULL,
  stake_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alarm Clock Logs Table
CREATE TABLE public.alarm_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alarm_id UUID NOT NULL REFERENCES public.alarm_clocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entered_at TIMESTAMP WITH TIME ZONE,
  code_entered TEXT,
  was_successful BOOLEAN DEFAULT false,
  penalty_applied DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verifications Table
CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type verification_type NOT NULL,
  verification_data JSONB,
  verified_value TEXT,
  is_approved BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_amount DECIMAL(10, 2) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type transaction_type NOT NULL,
  related_entity_type TEXT, -- 'goal', 'alarm', 'task', 'screen_time', etc.
  related_entity_id UUID,
  description TEXT,
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_screen_time_limits_user_id ON public.screen_time_limits(user_id);
CREATE INDEX idx_screen_time_limits_is_active ON public.screen_time_limits(is_active);
CREATE INDEX idx_screen_time_logs_user_id ON public.screen_time_logs(user_id);
CREATE INDEX idx_screen_time_logs_date ON public.screen_time_logs(date);
CREATE INDEX idx_locked_apps_user_id ON public.locked_apps(user_id);
CREATE INDEX idx_locked_apps_is_locked ON public.locked_apps(is_locked);
CREATE INDEX idx_app_usage_logs_user_id ON public.app_usage_logs(user_id);
CREATE INDEX idx_app_usage_logs_locked_app_id ON public.app_usage_logs(locked_app_id);
CREATE INDEX idx_app_usage_logs_accessed_at ON public.app_usage_logs(accessed_at);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_deadline ON public.goals(deadline);
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_goal_collaborations_goal_id ON public.goal_collaborations(goal_id);
CREATE INDEX idx_goal_collaborations_collaborator_id ON public.goal_collaborations(collaborator_id);
CREATE INDEX idx_alarm_clocks_user_id ON public.alarm_clocks(user_id);
CREATE INDEX idx_alarm_clocks_is_active ON public.alarm_clocks(is_active);
CREATE INDEX idx_verifications_goal_id ON public.verifications(goal_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);

-- ============================================
-- STEP 6: ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_time_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locked_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_usage_logs ENABLE ROW LEVEL SECURITY;
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

-- Screen Time Limits Policies
CREATE POLICY "Users can view their own screen time limits"
  ON public.screen_time_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own screen time limits"
  ON public.screen_time_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own screen time limits"
  ON public.screen_time_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- Screen Time Logs Policies
CREATE POLICY "Users can view their own screen time logs"
  ON public.screen_time_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own screen time logs"
  ON public.screen_time_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own screen time logs"
  ON public.screen_time_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Locked Apps Policies
CREATE POLICY "Users can view their own locked apps"
  ON public.locked_apps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own locked apps"
  ON public.locked_apps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locked apps"
  ON public.locked_apps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locked apps"
  ON public.locked_apps FOR DELETE
  USING (auth.uid() = user_id);

-- App Usage Logs Policies
CREATE POLICY "Users can view their own app usage logs"
  ON public.app_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own app usage logs"
  ON public.app_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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

-- ============================================
-- STEP 7: CREATE FUNCTIONS
-- ============================================

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
  
  -- Create default screen time limit for new user
  INSERT INTO public.screen_time_limits (user_id, daily_limit_minutes, penalty_amount)
  VALUES (NEW.id, 120, 50.00);
  
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
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screen_time_limits_updated_at 
  BEFORE UPDATE ON public.screen_time_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screen_time_logs_updated_at 
  BEFORE UPDATE ON public.screen_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locked_apps_updated_at 
  BEFORE UPDATE ON public.locked_apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at 
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alarm_clocks_updated_at 
  BEFORE UPDATE ON public.alarm_clocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DONE! All tables created with RLS policies
-- ============================================

