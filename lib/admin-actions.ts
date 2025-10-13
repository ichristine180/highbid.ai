import { createClient } from '@/lib/supabase-client';

export interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

export async function fetchAllUsers(): Promise<UserData[]> {
  try {
    const supabase = createClient();

    // For now, we'll return the current user data as a sample
    // In production, you would need a service role key to access all users
    // Or create a profiles table that mirrors auth.users
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      return [{
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at
      }];
    }

    return [];
  } catch (error) {
    console.error('Error in fetchAllUsers:', error);
    return [];
  }
}

export async function getUserStats() {
  const users = await fetchAllUsers();

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const totalUsers = users.length;
  const recentUsers = users.filter(user =>
    new Date(user.created_at) > lastMonth
  ).length;

  const activeUsers = users.filter(user =>
    user.last_sign_in_at && new Date(user.last_sign_in_at) > lastMonth
  ).length;

  return {
    totalUsers,
    recentUsers,
    activeUsers,
    users: users.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 10) // Get 10 most recent users
  };
}