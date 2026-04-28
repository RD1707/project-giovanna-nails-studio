-- 1. Updates to the clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS anamnesis JSONB;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS anamnesis_updated_at TIMESTAMPTZ;

-- 2. Expand financial categories (Despesas)
-- Assuming they are 'despesa'
INSERT INTO public.financial_categories (name, type) VALUES
  ('Pró-labore', 'despesa'),
  ('Transporte', 'despesa'),
  ('Cartão Bradesco', 'despesa'),
  ('Cartão Inter', 'despesa'),
  ('Cartão Nubank', 'despesa'),
  ('Cartão BB', 'despesa'),
  ('Cartão Mercado Pago', 'despesa'),
  ('Cartão CEF', 'despesa')
ON CONFLICT DO NOTHING;

-- 3. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Policies for tasks
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6. Trigger for updated_at on tasks
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();