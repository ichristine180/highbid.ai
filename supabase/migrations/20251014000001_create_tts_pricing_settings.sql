-- Create tts_pricing_settings table
CREATE TABLE IF NOT EXISTS tts_pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing (per word)
INSERT INTO tts_pricing_settings (price, description) VALUES
  (0.003, 'Price per word for text-to-speech generation')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE tts_pricing_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can read, only service role can update
CREATE POLICY "Anyone can view TTS pricing" ON tts_pricing_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role can update TTS pricing" ON tts_pricing_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tts_pricing_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tts_pricing_settings_timestamp
  BEFORE UPDATE ON tts_pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tts_pricing_settings_timestamp();
