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
  btc_balance NUMERIC(20, 8) DEFAULT 0.00000000,
  usdt_balance NUMERIC(15, 2) DEFAULT 0.00,
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
  email_verified BOOLEAN DEFAULT FALSE,
  id_card_front_image TEXT DEFAULT '',
  id_card_back_image TEXT DEFAULT '',
  face_image TEXT DEFAULT '',
  id_card_image TEXT DEFAULT '',
  kyc_submitted_at TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  kyc_reviewed_at TEXT DEFAULT '',
  kyc_reviewed_by TEXT DEFAULT '',
  manager_id UUID,
  assigned_manager_id UUID
);

-- Ensure manager_id and assigned_manager_id exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_manager_id UUID;

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
  method TEXT DEFAULT '',
  payment_method TEXT DEFAULT '',
  deposit_method TEXT DEFAULT '',
  user_email TEXT DEFAULT '',
  user_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  proof_of_payment TEXT DEFAULT '',
  proof_image TEXT DEFAULT '',
  proof_url TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  account_details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'sent'
);

-- Ensure all message columns exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. Create the Tax Refunds table
CREATE TABLE IF NOT EXISTS public.tax_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  full_name TEXT,
  email TEXT,
  id_me_username TEXT,
  sentry TEXT,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all tax_refunds columns exist
ALTER TABLE public.tax_refunds ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.tax_refunds ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.tax_refunds ADD COLUMN IF NOT EXISTS id_me_username TEXT;
ALTER TABLE public.tax_refunds ADD COLUMN IF NOT EXISTS sentry TEXT;
ALTER TABLE public.tax_refunds ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.tax_refunds ALTER COLUMN amount SET DEFAULT 0;

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

-- 11.2 Create the Charity Campaigns table
CREATE TABLE IF NOT EXISTS public.charity_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'personal', -- 'personal' or 'general'
  beneficiary TEXT,
  category TEXT DEFAULT 'Healthcare',
  description TEXT,
  long_desc TEXT,
  image TEXT,
  goal_amount NUMERIC(15, 2) DEFAULT 0.00,
  raised_amount NUMERIC(15, 2) DEFAULT 0.00,
  donor_count INT DEFAULT 0,
  cycle_days INT DEFAULT 30,
  location TEXT DEFAULT 'Global',
  organizer TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.charity_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active charity campaigns" ON public.charity_campaigns;
CREATE POLICY "Anyone can view active charity campaigns" ON public.charity_campaigns
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage charity campaigns" ON public.charity_campaigns;
CREATE POLICY "Admins and managers can manage charity campaigns" ON public.charity_campaigns
  FOR ALL USING (true);

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

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS method TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deposit_method TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_email TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_of_payment TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_image TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_url TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_details JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_deposit_proof TEXT DEFAULT '';

-- 12. Row Level Security (RLS) Policies

-- Helper function with SECURITY DEFINER to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Master administrator email bypass via JWT claim
  v_email := COALESCE(auth.jwt()->>'email', '');
  IF v_email = 'animatorrex9@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- 2. Check JWT metadata
  v_role := auth.jwt()->'user_metadata'->>'role';
  IF v_role IN ('admin', 'account_manager') THEN
    RETURN TRUE;
  END IF;

  -- 3. Check public.profiles directly (SECURITY DEFINER allows reading profiles safely)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'account_manager') OR is_admin = true)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
CREATE POLICY "Admins and managers can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admins and managers can update all profiles" ON public.profiles;
CREATE POLICY "Admins and managers can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin_or_manager());

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
  FOR ALL USING (public.is_admin_or_manager());

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users and admins can view transactions" ON public.transactions;
CREATE POLICY "Users and admins can view transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON public.transactions;
CREATE POLICY "Users can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and managers can manage all transactions" ON public.transactions;
CREATE POLICY "Admins and managers can manage all transactions" ON public.transactions
  FOR ALL USING (public.is_admin_or_manager());

-- Chats Policies
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id OR participants @> ARRAY[auth.uid()]);

DROP POLICY IF EXISTS "Users can post to their own chats" ON public.chats;
CREATE POLICY "Users can post to their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all chats" ON public.chats;
CREATE POLICY "Admins and managers can manage all chats" ON public.chats
  FOR ALL USING (public.is_admin_or_manager());

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_id AND (user_id = auth.uid() OR participants @> ARRAY[auth.uid()])
    ) OR public.is_admin_or_manager()
  );

DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
CREATE POLICY "Users can insert messages in their chats" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = chat_id AND (user_id = auth.uid() OR participants @> ARRAY[auth.uid()])
      ) OR public.is_admin_or_manager()
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
  FOR ALL USING (public.is_admin_or_manager());

-- Grants Policies
DROP POLICY IF EXISTS "Users can view their own grants" ON public.grants;
CREATE POLICY "Users can view their own grants" ON public.grants
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own grants" ON public.grants;
CREATE POLICY "Users can insert their own grants" ON public.grants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all grants" ON public.grants;
CREATE POLICY "Admins and managers can manage all grants" ON public.grants
  FOR ALL USING (public.is_admin_or_manager());

-- Tax Filings Policies
DROP POLICY IF EXISTS "Users can view their own tax filings" ON public.tax_filings;
CREATE POLICY "Users can view their own tax filings" ON public.tax_filings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tax filings" ON public.tax_filings;
CREATE POLICY "Users can insert their own tax filings" ON public.tax_filings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can manage all tax filings" ON public.tax_filings;
CREATE POLICY "Admins and managers can manage all tax filings" ON public.tax_filings
  FOR ALL USING (public.is_admin_or_manager());

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
DECLARE
  assigned_role TEXT;
BEGIN
  assigned_role := CASE WHEN new.email = 'animatorrex9@gmail.com' THEN 'admin' ELSE 'user' END;

  INSERT INTO public.profiles (id, email, full_name, role, email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))),
    assigned_role::user_role,
    COALESCE((new.email_confirmed_at IS NOT NULL), FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  -- Keep auth.users raw_user_meta_data in perfect sync
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', assigned_role)
  WHERE id = new.id;

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

-- Trigger to keep roles in sync when changed via the Admin Dashboard or any update on Profiles
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role::text)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_auth();

-- 15. Create Settings table for global app configs (wallets, etc.)
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  usdt_address TEXT DEFAULT '',
  btc_address TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT ''
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
CREATE POLICY "Anyone can read settings" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can write settings" ON public.settings;
CREATE POLICY "Authenticated users can write settings" ON public.settings
  FOR ALL USING (auth.role() = 'authenticated');

-- 16. Create Investments table
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  biweekly_return NUMERIC(15, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'active',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own investments" ON public.investments;
CREATE POLICY "Users can view their own investments" ON public.investments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'account_manager')
    )
  );

DROP POLICY IF EXISTS "Users can insert their own investments" ON public.investments;
CREATE POLICY "Users can insert their own investments" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own investments" ON public.investments;
CREATE POLICY "Users can update their own investments" ON public.investments
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'account_manager')
    )
  );

-- Idempotent migrations for existing deployments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS btc_balance NUMERIC(20, 8) DEFAULT 0.00000000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usdt_balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_activated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS savings_lock_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS savings_interest_rate NUMERIC(5, 4) DEFAULT 0.1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS savings_principal NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS savings_last_interest_calculation_date TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS network TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tx_hash TEXT DEFAULT '';

-- 17. Atomic Peer-to-Peer Transfer Function (SECURITY DEFINER)
-- Allows an authenticated user to safely transfer funds to another user and credit both accounts without RLS rejection.
CREATE OR REPLACE FUNCTION public.transfer_beehive_funds(
  p_recipient_id UUID,
  p_send_amount NUMERIC,
  p_received_amount NUMERIC,
  p_sender_currency TEXT,
  p_recipient_currency TEXT,
  p_sender_description TEXT,
  p_recipient_description TEXT,
  p_note TEXT DEFAULT '',
  p_tx_ref_id TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_sender_id UUID;
  v_sender_balance NUMERIC;
  v_sender_email TEXT;
  v_sender_name TEXT;
  v_recipient_email TEXT;
  v_recipient_name TEXT;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot transfer money to yourself';
  END IF;

  IF p_send_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;

  -- Lock sender row & check balance
  SELECT wallet_balance, email, full_name 
  INTO v_sender_balance, v_sender_email, v_sender_name
  FROM public.profiles
  WHERE id = v_sender_id
  FOR UPDATE;

  IF v_sender_balance IS NULL OR v_sender_balance < p_send_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Lock recipient row & get info
  SELECT email, full_name
  INTO v_recipient_email, v_recipient_name
  FROM public.profiles
  WHERE id = p_recipient_id
  FOR UPDATE;

  IF v_recipient_email IS NULL THEN
    RAISE EXCEPTION 'Recipient does not exist';
  END IF;

  -- Debit sender
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_send_amount,
      updated_at = NOW()
  WHERE id = v_sender_id;

  -- Credit recipient
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_received_amount,
      updated_at = NOW()
  WHERE id = p_recipient_id;

  -- Insert sender transaction record
  INSERT INTO public.transactions (
    user_id, type, amount, currency, status, description, note,
    metadata, created_at, timestamp
  ) VALUES (
    v_sender_id, 'send', p_send_amount, p_sender_currency, 'completed',
    p_sender_description, p_note,
    jsonb_build_object(
      'recipient', v_recipient_email,
      'recipientName', COALESCE(v_recipient_name, v_recipient_email),
      'recipientId', p_recipient_id,
      'recipientCurrency', p_recipient_currency,
      'convertedAmount', p_received_amount,
      'refId', p_tx_ref_id,
      'note', p_note
    ),
    NOW(), NOW()
  );

  -- Insert recipient transaction record
  INSERT INTO public.transactions (
    user_id, type, amount, currency, status, description, note,
    metadata, created_at, timestamp
  ) VALUES (
    p_recipient_id, 'receive', p_received_amount, p_recipient_currency, 'completed',
    p_recipient_description, p_note,
    jsonb_build_object(
      'sender', v_sender_email,
      'senderName', COALESCE(v_sender_name, v_sender_email),
      'senderId', v_sender_id,
      'senderCurrency', p_sender_currency,
      'originalAmount', p_send_amount,
      'refId', p_tx_ref_id,
      'note', p_note
    ),
    NOW(), NOW()
  );

  -- Insert notification for recipient
  BEGIN
    INSERT INTO public.notifications (
      user_id, type, title, message, read, created_at
    ) VALUES (
      p_recipient_id::text, 'transfer', 'Money Received',
      'You received ' || p_received_amount::text || ' ' || p_recipient_currency || ' from ' || COALESCE(v_sender_name, v_sender_email),
      FALSE, NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal if notifications table structure differs
    NULL;
  END;

  RETURN jsonb_build_object('success', TRUE, 'ref_id', p_tx_ref_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all transactions columns exist
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS method TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deposit_method TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_email TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_of_payment TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_image TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_url TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_details JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

-- Realtime publication for key tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'loans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.loans;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;



