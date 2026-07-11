-- Create SurgeryVideo table
CREATE TABLE public."SurgeryVideo" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  procedure_type text NOT NULL,
  surgeon_name text,
  patient_id text,
  surgery_date text,
  duration_minutes integer,
  department text,
  notes text,
  video_url text,
  status text DEFAULT 'uploaded',
  created_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create AnalysisResult table
CREATE TABLE public."AnalysisResult" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  surgery_video_id uuid REFERENCES public."SurgeryVideo"(id) ON DELETE CASCADE,
  overall_score integer,
  risk_level text,
  phases jsonb,
  instruments_detected jsonb,
  risk_events jsonb,
  technique_assessment text,
  recommendations jsonb,
  summary text,
  efficiency_score integer,
  safety_score integer,
  skill_score integer,
  created_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public."SurgeryVideo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AnalysisResult" ENABLE ROW LEVEL SECURITY;

-- Create policies (for testing, allow all operations)
CREATE POLICY "Allow all for SurgeryVideo" ON public."SurgeryVideo" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for AnalysisResult" ON public."AnalysisResult" FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT DO NOTHING;

-- Allow all operations on 'videos' bucket
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'videos') WITH CHECK (bucket_id = 'videos');
