-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_key VARCHAR(20) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO pricing_settings (size_key, price, description) VALUES
  ('512x512', 0.30, 'Small square image'),
  ('1024x1024', 0.50, 'Medium square image'),
  ('1024x1792', 0.70, 'Portrait image'),
  ('1792x1024', 0.70, 'Landscape image')
ON CONFLICT (size_key) DO NOTHING;

-- Enable RLS
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can read, only service role can update
CREATE POLICY "Anyone can view pricing" ON pricing_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role can update pricing" ON pricing_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pricing_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pricing_settings_timestamp
  BEFORE UPDATE ON pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_settings_timestamp();
