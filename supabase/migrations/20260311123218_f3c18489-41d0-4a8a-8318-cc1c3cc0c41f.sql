CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  price numeric,
  deadline text,
  ai_generated_scope text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
ON public.proposals FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own proposals"
ON public.proposals FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own proposals"
ON public.proposals FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own proposals"
ON public.proposals FOR DELETE TO authenticated
USING (user_id = auth.uid());