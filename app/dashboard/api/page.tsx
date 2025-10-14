'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Trash2, TrendingUp, Activity, Loader2, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Token {
  id: string;
  name: string;
  token: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiTokens() {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [showNewToken, setShowNewToken] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());

  // Fetch tokens on mount
  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/api-tokens');
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to load API tokens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts
  const dailyUsageData = [
    { date: 'Jan 10', calls: 1200 },
    { date: 'Jan 11', calls: 1800 },
    { date: 'Jan 12', calls: 1500 },
    { date: 'Jan 13', calls: 2200 },
    { date: 'Jan 14', calls: 1900 },
    { date: 'Jan 15', calls: 2400 },
    { date: 'Jan 16', calls: 2100 },
  ];

  const costBreakdownData = [
    { category: 'Image Generation', cost: 85 },
    { category: 'Image Editing', cost: 42 },
    { category: 'Upscaling', cost: 28 },
    { category: 'API Calls', cost: 15 },
  ];

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a token name',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTokenName }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedToken(data.token.token);
        setTokens([data.token, ...tokens]);
        setNewTokenName('');
        toast({
          title: 'Success',
          description: 'API token created successfully. Make sure to copy it now!',
        });
      } else {
        throw new Error('Failed to create token');
      }
    } catch (error) {
      console.error('Error creating token:', error);
      toast({
        title: 'Error',
        description: 'Failed to create API token',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyToken = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: 'Copied',
      description: 'Token copied to clipboard',
    });
  };

  const handleDeleteToken = async (id: string) => {
    try {
      const response = await fetch('/api/api-tokens', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setTokens(tokens.filter(t => t.id !== id));
        toast({
          title: 'Success',
          description: 'Token deleted successfully',
        });
      } else {
        throw new Error('Failed to delete token');
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete API token',
        variant: 'destructive',
      });
    }
  };

  const toggleTokenVisibility = (id: string) => {
    setVisibleTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskToken = (token: string) => {
    if (token.length < 12) return token;
    return `${token.substring(0, 10)}...${token.substring(token.length - 4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">API</h1>
          <p className="text-muted-foreground">Manage your API keys and monitor usage</p>
        </div>
        <Button onClick={() => setShowNewToken(!showNewToken)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Token
        </Button>
      </div>

      {showNewToken && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Token</CardTitle>
            <CardDescription>Generate a new API key for your application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {newlyCreatedToken ? (
              <>
                <div className="space-y-2">
                  <Label>Your New API Token</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newlyCreatedToken}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleCopyToken(newlyCreatedToken)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-amber-600">
                    ⚠️ Make sure to copy this token now. You won't be able to see it again!
                  </p>
                </div>
                <Button onClick={() => {
                  setShowNewToken(false);
                  setNewlyCreatedToken(null);
                }}>
                  Done
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tokenName">Token Name</Label>
                  <Input
                    id="tokenName"
                    placeholder="e.g., Production API"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateToken} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Token'
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewToken(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily API Calls
            </CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyUsageData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>Spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `$${value}`}
                />
                <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Tokens</CardTitle>
          <CardDescription>Keep your tokens secure and never share them publicly</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No API tokens yet. Create one to get started!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => {
                  const isVisible = visibleTokens.has(token.id);
                  return (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {isVisible ? token.token : maskToken(token.token)}
                        </code>
                      </TableCell>
                      <TableCell>{formatDate(token.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {token.last_used_at ? formatDate(token.last_used_at) : 'Never'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleTokenVisibility(token.id)}
                            title={isVisible ? 'Hide token' : 'Show token'}
                          >
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopyToken(token.token)}
                            title="Copy token"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteToken(token.id)}
                            title="Delete token"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Summary</CardTitle>
          <CardDescription>API consumption overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Requests Today</p>
              <p className="text-3xl font-bold">2,100</p>
              <p className="text-xs text-green-600">+12% from yesterday</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Requests This Month</p>
              <p className="text-3xl font-bold">45,678</p>
              <p className="text-xs text-green-600">+8% from last month</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold">99.8%</p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}