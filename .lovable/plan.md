

## Plan: Settings Page with Profile Management and Logo Upload

### 1. Database Changes

**Migration: Add columns to `profiles` table + create `logos` storage bucket**

```sql
-- Add new columns
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
```

### 2. Settings Page (`src/pages/Configuracoes.tsx`)

Full rewrite with a modern form using shadcn Card, Form (react-hook-form + zod), Input, Select, and file upload:

- **Load** profile data on mount via `supabase.from('profiles').select().eq('id', user.id).single()`
- **Full Name** field (Input)
- **Language Preference** field (Select: "PT" / "EN")
- **Logo Upload** with file input, preview of current logo, upload to `logos/{user.id}/logo.{ext}`
- **Save** button updates `profiles` table and shows toast on success/error
- Uses `useToast` from `@/hooks/use-toast`

### 3. Sidebar Update (`src/components/AppSidebar.tsx`)

- Fetch the user's profile (logo_url) on mount
- In the header area, if `logo_url` exists, render an `<img>` with proper sizing (h-8 max) instead of the Shield icon + "Pixel Safe" text
- If no logo, keep current Shield icon + text

### 4. Route

Route is already configured at `/configuracoes` -- no changes needed to `App.tsx`.

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create (add columns + storage bucket + policies) |
| `src/pages/Configuracoes.tsx` | Rewrite with full settings form |
| `src/components/AppSidebar.tsx` | Add profile query for logo display |

