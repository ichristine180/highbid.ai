'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Image, DollarSign, Activity, LogOut, Loader2, Settings } from 'lucide-react';
import { getUserStats, type UserData } from '@/lib/admin-actions';
import { useToast } from '@/hooks/use-toast';

interface PricingSetting {
  id: string;
  size_key: string;
  price: number;
  description: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    recentUsers: 0,
    activeUsers: 0,
    users: [] as UserData[]
  });
  const [pricing, setPricing] = useState<PricingSetting[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (adminAuth !== 'true') {
      router.push('/admin');
      return;
    }

    // Fetch user statistics and pricing
    fetchUserData();
    fetchPricing();
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

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/pricing');
      if (response.ok) {
        const data = await response.json();
        setPricing(data.pricing || []);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setPricingLoading(false);
    }
  };

  const handlePriceChange = (sizeKey: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;

    setPricing(prev =>
      prev.map(p =>
        p.size_key === sizeKey ? { ...p, price } : p
      )
    );
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pricing }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Pricing updated successfully',
        });
      } else {
        throw new Error('Failed to update pricing');
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pricing',
        variant: 'destructive',
      });
    } finally {
      setSavingPricing(false);
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

        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Image Generation Pricing
            </CardTitle>
            <CardDescription>
              Set the cost per image generation based on size
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pricingLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pricing.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <Label htmlFor={item.size_key}>
                        {item.size_key}
                        <span className="text-xs text-muted-foreground block">
                          {item.description}
                        </span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">$</span>
                        <Input
                          id={item.size_key}
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handlePriceChange(item.size_key, e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePricing}
                    disabled={savingPricing}
                  >
                    {savingPricing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Pricing'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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