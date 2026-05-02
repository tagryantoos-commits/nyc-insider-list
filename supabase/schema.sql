-- NYC Insider List — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  end_time TEXT,
  venue TEXT,
  address TEXT,
  neighborhood TEXT,
  category TEXT NOT NULL,
  cost TEXT,
  is_free BOOLEAN DEFAULT false,
  url TEXT,
  description TEXT,
  source TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title, date, venue)
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT USING (true);

CREATE POLICY "Service role manages events" ON events
  FOR ALL USING (auth.role() = 'service_role');

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due')),
  google_calendar_granted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages subscribers" ON subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- Calendar actions queue (processed by n8n)
CREATE TABLE IF NOT EXISTS calendar_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages calendar_actions" ON calendar_actions
  FOR ALL USING (auth.role() = 'service_role');
