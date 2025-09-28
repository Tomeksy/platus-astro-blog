-- EXACT SQL function from speaKI's implementation
-- Run this in your Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.match_documents(vector, double precision, integer);

-- Create the exact function speaKI uses
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_threshold double precision,
  match_count integer
)
RETURNS TABLE(
  id uuid,
  content text,
  metadata jsonb,
  embedding vector,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    id,
    content,
    metadata,
    embedding,
    1 - (embedding <=> query_embedding) as similarity
  FROM knowledge_base
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$function$;

-- Ensure the knowledge_base table exists with correct schema
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  embedding vector(1536), -- Must be 1536 dimensions for text-embedding-3-small
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for vector similarity search (if not exists)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding
ON public.knowledge_base
USING ivfflat (embedding vector_cosine_ops);

-- Disable RLS (same as speaKI)
ALTER TABLE public.knowledge_base DISABLE ROW LEVEL SECURITY;

-- Grant permissions (if needed)
GRANT ALL ON public.knowledge_base TO anon;
GRANT ALL ON public.knowledge_base TO authenticated;
GRANT ALL ON public.knowledge_base TO service_role;

-- Test query to verify setup
SELECT 
  COUNT(*) as total_records,
  COUNT(embedding) as records_with_embeddings
FROM public.knowledge_base;
