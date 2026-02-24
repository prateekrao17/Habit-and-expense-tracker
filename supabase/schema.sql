-- Habit Tracker Database Schema
-- This schema implements a series-based streak system for habit tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. habits_series table
-- Stores habit information with series-based streak tracking
CREATE TABLE IF NOT EXISTS habits_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  best_sequence INTEGER NOT NULL DEFAULT 0,
  last_ticked_at TIMESTAMP WITH TIME ZONE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('series', 'duration', 'count')),
  color TEXT DEFAULT '#3B82F6', -- Hex color for UI customization
  target_number INTEGER, -- Optional target for count/duration goals
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_name) -- Prevent duplicate habit names per user
);

-- 2. daily_logs table
-- Tracks daily completions with sequence numbers for streak visualization
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits_series(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  sequence_number INTEGER NOT NULL, -- The sequence number when this day was logged
  completed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, log_date) -- One log per habit per day
);

-- 3. health_tracking table
-- Flexible storage for various health metrics
CREATE TABLE IF NOT EXISTS health_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fitness', 'meals', 'sunlight', 'screentime')),
  value JSONB NOT NULL, -- Flexible JSON storage for different data types
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. quick_notes table
-- Simple note-taking with tags and pinning
CREATE TABLE IF NOT EXISTS quick_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_series_user_id ON habits_series(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_series_last_ticked ON habits_series(last_ticked_at);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_habit_id ON daily_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_habit_date ON daily_logs(habit_id, log_date);

CREATE INDEX IF NOT EXISTS idx_health_tracking_user_id ON health_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_health_tracking_date ON health_tracking(log_date);
CREATE INDEX IF NOT EXISTS idx_health_tracking_category ON health_tracking(category);

CREATE INDEX IF NOT EXISTS idx_quick_notes_user_id ON quick_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_notes_pinned ON quick_notes(pinned);
CREATE INDEX IF NOT EXISTS idx_quick_notes_created ON quick_notes(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_habits_series_updated_at BEFORE UPDATE ON habits_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_tracking_updated_at BEFORE UPDATE ON health_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_notes_updated_at BEFORE UPDATE ON quick_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle streak logic when ticking a habit
-- This function checks if the streak should be reset or incremented
CREATE OR REPLACE FUNCTION tick_habit_series(
  p_habit_id UUID,
  p_user_id UUID,
  p_log_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  v_habit habits_series%ROWTYPE;
  v_last_ticked DATE;
  v_days_since_last INTEGER;
  v_new_sequence INTEGER;
  v_new_best INTEGER;
  v_result JSON;
BEGIN
  -- Get the habit
  SELECT * INTO v_habit FROM habits_series WHERE id = p_habit_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;

  -- Check if already ticked today
  IF EXISTS (SELECT 1 FROM daily_logs WHERE habit_id = p_habit_id AND log_date = p_log_date) THEN
    RAISE EXCEPTION 'Already ticked today';
  END IF;

  -- Calculate days since last tick
  IF v_habit.last_ticked_at IS NULL THEN
    v_days_since_last := 999; -- Never ticked before
  ELSE
    v_days_since_last := p_log_date - v_habit.last_ticked_at::DATE;
  END IF;

  -- Streak logic: if more than 1 day ago, reset to 1, otherwise increment
  IF v_days_since_last > 1 THEN
    v_new_sequence := 1;
  ELSE
    v_new_sequence := v_habit.current_sequence + 1;
  END IF;

  -- Update best sequence if new record
  v_new_best := GREATEST(v_habit.best_sequence, v_new_sequence);

  -- Update habit
  UPDATE habits_series
  SET 
    current_sequence = v_new_sequence,
    best_sequence = v_new_best,
    last_ticked_at = NOW(),
    updated_at = NOW()
  WHERE id = p_habit_id;

  -- Insert daily log
  INSERT INTO daily_logs (user_id, habit_id, log_date, sequence_number, completed)
  VALUES (p_user_id, p_habit_id, p_log_date, v_new_sequence, true);

  -- Return result
  v_result := json_build_object(
    'new_sequence', v_new_sequence,
    'new_best', v_new_best,
    'was_reset', v_days_since_last > 1,
    'is_milestone', v_new_sequence IN (5, 10, 25, 50, 100)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE habits_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

-- Policies for habits_series
CREATE POLICY "Users can view their own habits"
  ON habits_series FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON habits_series FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON habits_series FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON habits_series FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for daily_logs
CREATE POLICY "Users can view their own logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs"
  ON daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for health_tracking
CREATE POLICY "Users can view their own health data"
  ON health_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health data"
  ON health_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health data"
  ON health_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health data"
  ON health_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for quick_notes
CREATE POLICY "Users can view their own notes"
  ON quick_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON quick_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON quick_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON quick_notes FOR DELETE
  USING (auth.uid() = user_id);
