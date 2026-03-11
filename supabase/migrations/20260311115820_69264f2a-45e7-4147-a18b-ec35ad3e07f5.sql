
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  company text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
ON public.clients FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own clients"
ON public.clients FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own clients"
ON public.clients FOR DELETE TO authenticated
USING (user_id = auth.uid());
