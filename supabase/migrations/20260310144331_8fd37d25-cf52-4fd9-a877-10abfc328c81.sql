-- Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN logo_url text,
  ADD COLUMN language_preference text NOT NULL DEFAULT 'PT';

-- Create logos storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can view logos (public bucket)
CREATE POLICY "Public logo access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logos');

-- RLS: users can update/delete own logos
CREATE POLICY "Users can update own logo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own logo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);