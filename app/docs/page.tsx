'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, BookOpen, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Docs() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">Highbid.ai</Link>
          <div className="flex gap-4">
            {user ? (
              <Button variant="ghost" asChild>
                <Link href="/dashboard/generate">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to integrate AI image generation into your app
            </p>
          </div>

          <Tabs defaultValue="quickstart" className="mb-12">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
              <TabsTrigger value="reference">API Reference</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
            </TabsList>

            <TabsContent value="quickstart" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Getting Started
                  </CardTitle>
                  <CardDescription>Get up and running in minutes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">1. Get your API key</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sign up and navigate to your dashboard to generate an API token.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/auth/signup">Create Account</Link>
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">2. Make your first request</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <code className="text-sm">
                        {`curl -X POST https://api.imageai.com/v1/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "A sunset over mountains",
    "width": 1024,
    "height": 1024
  }'`}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reference" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    API Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">POST /v1/generate</h3>
                    <p className="text-sm text-muted-foreground mb-4">Generate an image from a text prompt</p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Request Body</h4>
                        <div className="bg-muted p-4 rounded-lg text-sm">
                          <code>{`{
  "prompt": "string (required)",
  "width": "number (default: 1024)",
  "height": "number (default: 1024)",
  "steps": "number (default: 30)",
  "seed": "number (optional)"
}`}</code>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Response</h4>
                        <div className="bg-muted p-4 rounded-lg text-sm">
                          <code>{`{
  "id": "img_123456",
  "url": "https://cdn.imageai.com/...",
  "created_at": "2025-01-15T10:30:00Z"
}`}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Code Examples
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">JavaScript / Node.js</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <code className="text-sm">{`const response = await fetch('https://api.imageai.com/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'A sunset over mountains',
    width: 1024,
    height: 1024
  })
});

const data = await response.json();
console.log(data.url);`}</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Python</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <code className="text-sm">{`import requests

response = requests.post(
    'https://api.imageai.com/v1/generate',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json={
        'prompt': 'A sunset over mountains',
        'width': 1024,
        'height': 1024
    }
)

data = response.json()
print(data['url'])`}</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}