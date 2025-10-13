-- User balances table
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  payment_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own balance
CREATE POLICY "Users can view own balance" ON user_balances
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all balances and transactions (for webhooks)
CREATE POLICY "Service role can manage balances" ON user_balances
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage transactions" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update balance
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_operation TEXT DEFAULT 'add'
)
RETURNS DECIMAL AS $$
DECLARE
  new_balance DECIMAL;
BEGIN
  -- Insert or update balance
  INSERT INTO user_balances (user_id, balance)
  VALUES (p_user_id, CASE WHEN p_operation = 'add' THEN p_amount ELSE -p_amount END)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = CASE
      WHEN p_operation = 'add' THEN user_balances.balance + p_amount
      WHEN p_operation = 'subtract' THEN user_balances.balance - p_amount
      ELSE p_amount
    END,
    updated_at = NOW()
  RETURNING balance INTO new_balance;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;