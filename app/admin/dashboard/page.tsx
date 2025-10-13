'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Image, DollarSign, Activity, LogOut, Loader2 } from 'lucide-react';
import { getUserStats, type UserData } from '@/lib/admin-actions';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    recentUsers: 0,
    activeUsers: 0,
    users: [] as UserData[]
  });

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (adminAuth !== 'true') {
      router.push('/admin');
      return;
    }

    // Fetch user statistics
    fetchUserData();
  }, [router]);

  const fetchUserData = async () => {
    try {
      const data = await getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminUser');
    router.push('/admin');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserStatus = (user: UserData) => {
    if (!user.email_confirmed_at) return 'pending';
    if (!user.last_sign_in_at) return 'inactive';
    const lastSignIn = new Date(user.last_sign_in_at);
    const daysSinceSignIn = Math.floor((Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceSignIn < 7 ? 'active' : 'inactive';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview of platform metrics and user activity</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.recentUsers > 0 ? `+${stats.recentUsers} this month` : 'No new users this month'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{stats.activeUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Image className="h-4 w-4" />
                Images Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$0</p>
              <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest user registrations and activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : stats.users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users registered yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.users.map((user) => {
                    const status = getUserStatus(user);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">
                          {user.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status === 'active' ? 'default' :
                              status === 'pending' ? 'outline' :
                              'secondary'
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}