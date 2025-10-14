-- Create tts_generations table
CREATE TABLE IF NOT EXISTS tts_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  size VARCHAR(20),
  audio_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  cost DECIMAL(10,6) NOT NULL DEFAULT 0.00,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tts_generations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own TTS generations" ON tts_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own TTS generations" ON tts_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own TTS generations" ON tts_generations
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tts_generations_user_id ON tts_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_generations_created_at ON tts_generations(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tts_generation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tts_generation_timestamp
  BEFORE UPDATE ON tts_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_tts_generation_timestamp();
