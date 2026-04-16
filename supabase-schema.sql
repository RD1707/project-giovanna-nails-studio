-- ============================================================
-- Estudio Giovanna Nails - Complete Database Schema
-- Copy and paste this entire file into the Supabase SQL Editor
-- ============================================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'NAIL_DESIGNER');
CREATE TYPE public.appointment_status AS ENUM ('agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu');
CREATE TYPE public.entry_type AS ENUM ('receita', 'despesa');
CREATE TYPE public.payment_method AS ENUM ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia', 'outro');
CREATE TYPE public.bill_status AS ENUM ('pendente', 'pago', 'vencido');
CREATE TYPE public.notification_type AS ENUM ('agendamento', 'financeiro', 'conta_vencer', 'cancelamento', 'geral');

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. CLIENTS TABLE
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  birth_date DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. SERVICES TABLE
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  average_duration INTEGER NOT NULL DEFAULT 60, -- minutes
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. FINANCIAL CATEGORIES TABLE
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.entry_type NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. APPOINTMENTS TABLE
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.appointment_status NOT NULL DEFAULT 'agendado',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. APPOINTMENT SERVICES (N:N)
CREATE TABLE public.appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 9. FINANCIAL ENTRIES (MAIN LEDGER)
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type public.entry_type NOT NULL,
  category_id UUID REFERENCES public.financial_categories(id),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  payment_method public.payment_method,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. BILLS TO PAY
CREATE TABLE public.bills_to_pay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  due_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status public.bill_status NOT NULL DEFAULT 'pendente',
  category_id UUID REFERENCES public.financial_categories(id),
  paid_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. SCHEDULE BLOCKS
CREATE TABLE public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'geral',
  read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_appointments_start ON public.appointments(start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_financial_entries_date ON public.financial_entries(entry_date);
CREATE INDEX idx_financial_entries_type ON public.financial_entries(type);
CREATE INDEX idx_bills_due_date ON public.bills_to_pay(due_date);
CREATE INDEX idx_bills_status ON public.bills_to_pay(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills_to_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKING
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is authenticated (has any role)
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
  )
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- USER ROLES
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- CLIENTS (all authenticated users can CRUD)
CREATE POLICY "Authenticated users can manage clients" ON public.clients
  FOR ALL TO authenticated USING (public.is_authenticated())
  WITH CHECK (public.is_authenticated());

-- SERVICES
CREATE POLICY "Authenticated users can view services" ON public.services
  FOR SELECT TO authenticated USING (public.is_authenticated());
CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- FINANCIAL CATEGORIES
CREATE POLICY "Authenticated users can view categories" ON public.financial_categories
  FOR SELECT TO authenticated USING (public.is_authenticated());
CREATE POLICY "Admins can manage categories" ON public.financial_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- APPOINTMENTS
CREATE POLICY "Authenticated users can manage appointments" ON public.appointments
  FOR ALL TO authenticated USING (public.is_authenticated())
  WITH CHECK (public.is_authenticated());

-- APPOINTMENT SERVICES
CREATE POLICY "Authenticated users can manage appointment services" ON public.appointment_services
  FOR ALL TO authenticated USING (public.is_authenticated())
  WITH CHECK (public.is_authenticated());

-- FINANCIAL ENTRIES
CREATE POLICY "Authenticated users can manage financial entries" ON public.financial_entries
  FOR ALL TO authenticated USING (public.is_authenticated())
  WITH CHECK (public.is_authenticated());

-- BILLS TO PAY
CREATE POLICY "Authenticated users can manage bills" ON public.bills_to_pay
  FOR ALL TO authenticated USING (public.is_authenticated())
  WITH CHECK (public.is_authenticated());

-- SCHEDULE BLOCKS
CREATE POLICY "Authenticated users can manage schedule blocks" ON public.schedule_blocks
  FOR ALL TO authenticated USING (public.is_authenticated())
  WITH CHECK (public.is_authenticated());

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_authenticated());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_financial_entries_updated_at BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_bills_updated_at BEFORE UPDATE ON public.bills_to_pay
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED DATA: Financial Categories
-- ============================================================
INSERT INTO public.financial_categories (name, type) VALUES
  -- Revenue categories
  ('Servicos', 'receita'),
  ('Produtos', 'receita'),
  ('Pacotes', 'receita'),
  ('Outros (Receita)', 'receita'),
  -- Expense categories
  ('Aluguel', 'despesa'),
  ('Insumos', 'despesa'),
  ('Marketing', 'despesa'),
  ('Energia', 'despesa'),
  ('Internet', 'despesa'),
  ('Manutencao', 'despesa'),
  ('Materiais Descartaveis', 'despesa'),
  ('Transporte', 'despesa'),
  ('Impostos', 'despesa'),
  ('Taxas de Cartao', 'despesa'),
  ('Outros (Despesa)', 'despesa');

-- ============================================================
-- SEED DATA: Default Services
-- ============================================================
INSERT INTO public.services (name, default_price, average_duration) VALUES
  ('Alongamento em Gel', 150.00, 120),
  ('Manutencao', 80.00, 90),
  ('Remocao', 40.00, 30),
  ('Esmaltacao em Gel', 60.00, 60),
  ('Nail Art', 30.00, 30),
  ('Banho de Gel', 100.00, 90);
