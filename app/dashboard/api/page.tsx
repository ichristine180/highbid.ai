'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Trash2, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Token {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
}

export default function ApiTokens() {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'sk_live_abc123...',
      created: '2025-01-10',
      lastUsed: '2025-01-15',
    },
  ]);
  const [newTokenName, setNewTokenName] = useState('');
  const [showNewToken, setShowNewToken] = useState(false);

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

  const handleCreateToken = () => {
    if (!newTokenName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a token name',
        variant: 'destructive',
      });
      return;
    }

    const newToken: Token = {
      id: Date.now().toString(),
      name: newTokenName,
      key: `sk_live_${Math.random().toString(36).substring(2, 15)}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };

    setTokens([...tokens, newToken]);
    setNewTokenName('');
    setShowNewToken(false);
    toast({
      title: 'Success',
      description: 'API token created successfully',
    });
  };

  const handleCopyToken = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: 'Copied',
      description: 'Token copied to clipboard',
    });
  };

  const handleDeleteToken = (id: string) => {
    setTokens(tokens.filter(t => t.id !== id));
    toast({
      title: 'Success',
      description: 'Token deleted successfully',
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
              <Button onClick={handleCreateToken}>Create Token</Button>
              <Button variant="outline" onClick={() => setShowNewToken(false)}>
                Cancel
              </Button>
            </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{token.key}</code>
                  </TableCell>
                  <TableCell>{token.created}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{token.lastUsed}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyToken(token.key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteToken(token.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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