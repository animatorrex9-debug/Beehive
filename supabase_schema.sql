-- Beehive Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/editor)

-- =========================================================================
-- OPTIONAL CLEAN RESET:
-- If your database is in a broken state or contains conflicting columns from a previous project,
-- uncomment the lines below, run them ONCE to wipe the stale schemas, and then run the whole script.
-- =========================================================================
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.donations CASCADE;
-- DROP TABLE IF EXISTS public.tax_filings CASCADE;
-- DROP TABLE IF EXISTS public.grants CASCADE;
-- DROP TABLE IF EXISTS public.tax_refunds CASCADE;
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.chats CASCADE;
-- DROP TABLE IF EXISTS public.transactions CASCADE;
-- DROP TABLE IF EXISTS public.loans CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP TYPE IF EXISTS kyc_status CASCADE;
-- =========================================================================

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
  sentry TEXT DEFAULT '', -- Password/PIN field
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
  additional_details JSONB DEFAULT '{}'::jsonb,
  draft_data JSONB DEFAULT '{}'::jsonb,
  pin_sent BOOLEAN DEFAULT FALSE,
  pin_submitted TEXT DEFAULT '',
  submitted_pin TEXT DEFAULT '',
  pin_submitted_at TIMESTAMPTZ,
  additional_details_submitted_at TIMESTAMPTZ,
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

-- 5. Create the Chats (rooms) table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id UUID,
  participants UUID[] DEFAULT '{}'::UUID[],
  last_message TEXT DEFAULT 'Chat started',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_timestamp TIMESTAMPTZ DEFAULT NOW(),
  unread_count JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- 6. Create the Messages table under chats
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT,
  sender_role TEXT DEFAULT 'user',
  role TEXT DEFAULT 'user',
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. Create the Tax Refunds table
CREATE TABLE IF NOT EXISTS public.tax_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tax_refunds ENABLE ROW LEVEL SECURITY;

-- 8. Create the Grants table
CREATE TABLE IF NOT EXISTS public.grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  purpose TEXT,
  description TEXT,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;

-- 9. Create the Tax Filings table
CREATE TABLE IF NOT EXISTS public.tax_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  filing_status TEXT,
  gross_income NUMERIC(15, 2),
  deductions NUMERIC(15, 2),
  tax_withheld NUMERIC(15, 2),
  refund_amount NUMERIC(15, 2),
  status TEXT DEFAULT 'processing',
  currency TEXT DEFAULT 'USD',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tax_filings ENABLE ROW LEVEL SECURITY;

-- 10. Create the Donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  charity_id TEXT NOT NULL,
  charity_name TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 11. Create the Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- UUID or 'admin'
  type TEXT,
  title TEXT,
  message TEXT,
  loan_id TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 11.5 Safe Migrations for Pre-existing Tables (Idempotent updates)
-- These ALTER TABLE statements ensure that if tables already existed in your project, they are updated with the columns needed for Beehive
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sentry TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_return_calculation_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ssn TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_income TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state_of_origin TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credit_cards JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_details JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_details JSONB;

ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS additional_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS pin_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS pin_submitted TEXT DEFAULT '';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS submitted_pin TEXT DEFAULT '';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS pin_submitted_at TIMESTAMPTZ;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS additional_details_submitted_at TIMESTAMPTZ;

ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS participants UUID[] DEFAULT '{}'::UUID[];
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS last_message TEXT DEFAULT 'Chat started';
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS last_message_timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS unread_count JSONB DEFAULT '{}'::jsonb;

-- 12. Row Level Security (RLS) Policies

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
  FOR SELECT USING (auth.uid() = user_id OR participants @> ARRAY[auth.uid()]);

DROP POLICY IF EXISTS "Users can post to their own chats" ON public.chats;
CREATE POLICY "Users can post to their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all chats" ON public.chats;
CREATE POLICY "Admins and managers can manage all chats" ON public.chats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_id AND (user_id = auth.uid() OR participants @> ARRAY[auth.uid()])
    ) OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
CREATE POLICY "Users can insert messages in their chats" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = chat_id AND (user_id = auth.uid() OR participants @> ARRAY[auth.uid()])
      ) OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
      )
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

-- Grants Policies
DROP POLICY IF EXISTS "Users can view their own grants" ON public.grants;
CREATE POLICY "Users can view their own grants" ON public.grants
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own grants" ON public.grants;
CREATE POLICY "Users can insert their own grants" ON public.grants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all grants" ON public.grants;
CREATE POLICY "Admins and managers can manage all grants" ON public.grants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- Tax Filings Policies
DROP POLICY IF EXISTS "Users can view their own tax filings" ON public.tax_filings;
CREATE POLICY "Users can view their own tax filings" ON public.tax_filings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tax filings" ON public.tax_filings;
CREATE POLICY "Users can insert their own tax filings" ON public.tax_filings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all tax filings" ON public.tax_filings;
CREATE POLICY "Admins and managers can manage all tax filings" ON public.tax_filings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'account_manager')
    )
  );

-- Donations Policies
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
CREATE POLICY "Users can view their own donations" ON public.donations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own donations" ON public.donations;
CREATE POLICY "Users can insert their own donations" ON public.donations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = 'admin');

DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = 'admin');


-- 13. Automate Profile Creation on Signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))),
    CASE WHEN new.email = 'animatorrex9@gmail.com' THEN 'admin'::user_role ELSE 'user'::user_role END,
    COALESCE((new.email_confirmed_at IS NOT NULL), FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Extremely robust: Catch all errors to prevent user registration from failing
  -- If there are schema mismatches or missing tables, this ensures auth sign up succeeds.
  RAISE WARNING 'Error auto-creating profile in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
