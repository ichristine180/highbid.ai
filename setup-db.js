import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('Setting up database tables...');

  try {
    // Create user_balances table
    const { error: balanceTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_balances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `
    });

    if (balanceTableError) {
      console.log('Note: exec_sql not available, tables need to be created manually');
      console.log('Please run the SQL from lib/database-setup.sql in your Supabase dashboard');
      return;
    }

    console.log('✅ user_balances table created');

    // Create transactions table
    const { error: transactionTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (transactionTableError) {
      console.error('Error creating transactions table:', transactionTableError);
    } else {
      console.log('✅ transactions table created');
    }

    // Enable RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;'
    });

    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;'
    });

    console.log('✅ RLS enabled');

    // Create policies
    const policies = [
      `CREATE POLICY IF NOT EXISTS "Users can view own balance" ON user_balances
        FOR SELECT USING (auth.uid() = user_id);`,

      `CREATE POLICY IF NOT EXISTS "Users can view own transactions" ON transactions
        FOR SELECT USING (auth.uid() = user_id);`,

      `CREATE POLICY IF NOT EXISTS "Service role can manage balances" ON user_balances
        FOR ALL USING (auth.role() = 'service_role');`,

      `CREATE POLICY IF NOT EXISTS "Service role can manage transactions" ON transactions
        FOR ALL USING (auth.role() = 'service_role');`
    ];

    for (const policy of policies) {
      await supabase.rpc('exec_sql', { sql: policy });
    }

    console.log('✅ RLS policies created');

    // Create function
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_user_balance(
          p_user_id UUID,
          p_amount DECIMAL,
          p_operation TEXT DEFAULT 'add'
        )
        RETURNS DECIMAL AS $$
        DECLARE
          new_balance DECIMAL;
        BEGIN
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
      `
    });

    console.log('✅ update_user_balance function created');
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('Error setting up database:', error);
    console.log('\nFallback: Please run the SQL from lib/database-setup.sql manually in your Supabase dashboard');
  }
}

setupDatabase();