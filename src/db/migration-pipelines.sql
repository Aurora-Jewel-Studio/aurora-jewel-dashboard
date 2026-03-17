-- Aurora Jewel Studio — Pipeline, Design Cards & Comments Schema
-- Run this in your Supabase SQL Editor

-- 1. Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Design Cards table
CREATE TABLE IF NOT EXISTS design_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reference_image_url TEXT,
  reference_uploaded_by UUID REFERENCES users(id),
  reference_uploaded_at TIMESTAMPTZ,
  cad_file_url TEXT,
  cad_uploaded_by UUID REFERENCES users(id),
  cad_uploaded_at TIMESTAMPTZ,
  final_design_url TEXT,
  final_uploaded_by UUID REFERENCES users(id),
  final_uploaded_at TIMESTAMPTZ,
  assigned_designer_id UUID REFERENCES users(id),
  stage TEXT DEFAULT 'reference' CHECK (stage IN
    ('reference','cad_in_progress','cad_uploaded','final_uploaded','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Design Comments table
CREATE TABLE IF NOT EXISTS design_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_card_id UUID REFERENCES design_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create storage bucket for pipeline files (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pipeline-files', 'pipeline-files', true);

-- 5. Enable RLS (optional, we bypass with service role key)
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;
