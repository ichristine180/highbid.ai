-- Add order_id column to transactions table for unique webhook matching
ALTER TABLE transactions
ADD COLUMN order_id VARCHAR(255);

-- Add index for faster order_id lookups
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);

-- Add payment_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'transactions' AND column_name = 'payment_url') THEN
        ALTER TABLE transactions ADD COLUMN payment_url TEXT;
    END IF;
END $$;