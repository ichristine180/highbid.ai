import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Create service role client for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({
        error: 'Service role key not configured',
        message: 'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Creating database tables...');

    // Create user_balances table
    const { error: balanceTableError } = await supabase
      .from('user_balances')
      .select('id')
      .limit(1);

    if (balanceTableError && balanceTableError.code === 'PGRST116') {
      // Table doesn't exist, let's try to create it using raw SQL
      const createBalanceTable = `
        CREATE TABLE IF NOT EXISTS user_balances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `;

      // Use PostgreSQL REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: createBalanceTable })
      });

      if (!response.ok) {
        console.error('Failed to create user_balances table');
      }
    }

    // Create transactions table
    const { error: transactionTableError } = await supabase
      .from('transactions')
      .select('id')
      .limit(1);

    if (transactionTableError && transactionTableError.code === 'PGRST116') {
      const createTransactionTable = `
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
      `;

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: createTransactionTable })
      });

      if (!response.ok) {
        console.error('Failed to create transactions table');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup attempted. Please check your Supabase dashboard to verify.',
      note: 'If tables were not created automatically, please run the SQL from lib/database-setup.sql in your Supabase dashboard.'
    });

  } catch (error) {
    console.error('Database setup error:', error);

    return NextResponse.json({
      error: 'Automatic setup failed',
      message: 'Please run the SQL manually from lib/database-setup.sql in your Supabase dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}