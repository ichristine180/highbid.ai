"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Image as ImageIcon, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Generation {
  id: string;
  prompt: string;
  size: string;
  image_url: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  cost: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface PricingSetting {
  size_key: string;
  price: number;
  description: string;
}

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(true);
  const [pricing, setPricing] = useState<PricingSetting[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch generations
  const fetchGenerations = async () => {
    try {
      const response = await fetch("/api/generations");
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error("Error fetching generations:", error);
    } finally {
      setIsLoadingGenerations(false);
    }
  };

  // Fetch pricing
  const fetchPricing = async () => {
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = await response.json();
        setPricing(data.pricing || []);
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
    }
  };

  // Fetch user balance
  const fetchUserBalance = async () => {
    try {
      const response = await fetch("/api/balance");
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  // Get current price for selected size
  const getCurrentPrice = () => {
    const pricingItem = pricing.find(p => p.size_key === size);
    return pricingItem?.price || 0;
  };

  // Fetch data on mount
  useEffect(() => {
    fetchGenerations();
    fetchPricing();
    fetchUserBalance();
  }, []);

  // Simulate progress during image generation (~3 minutes)
  useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      setProgressMessage("");
      return;
    }

    setProgress(0);
    setProgressMessage("Initializing...");

    const intervals: NodeJS.Timeout[] = [];
    intervals.push(
      setTimeout(() => {
        setProgress(5);
        setProgressMessage("Connecting to AI service...");
      }, 3000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(10);
        setProgressMessage("Processing your prompt...");
      }, 8000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(15);
        setProgressMessage("Analyzing prompt details...");
      }, 15000)
    );

    // Stage 2: Processing (15-30%) - 20-50 seconds
    intervals.push(
      setTimeout(() => {
        setProgress(20);
        setProgressMessage("Starting image generation...");
      }, 25000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(25);
        setProgressMessage("Building initial structure...");
      }, 35000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(30);
        setProgressMessage("Generating base composition...");
      }, 45000)
    );

    // Stage 3: Generating (30-60%) - 50-90 seconds
    intervals.push(
      setTimeout(() => {
        setProgress(35);
        setProgressMessage("Creating image layers...");
      }, 55000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(42);
        setProgressMessage("Adding details and textures...");
      }, 70000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(50);
        setProgressMessage("Enhancing colors and lighting...");
      }, 85000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(58);
        setProgressMessage("Refining visual elements...");
      }, 100000)
    );

    // Stage 4: Refining (60-80%) - 90-140 seconds
    intervals.push(
      setTimeout(() => {
        setProgress(65);
        setProgressMessage("Processing fine details...");
      }, 115000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(72);
        setProgressMessage("Optimizing composition...");
      }, 130000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(78);
        setProgressMessage("Applying artistic refinements...");
      }, 145000)
    );

    // Stage 5: Finalizing (80-95%) - 140-170 seconds
    intervals.push(
      setTimeout(() => {
        setProgress(83);
        setProgressMessage("Finalizing image quality...");
      }, 155000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(88);
        setProgressMessage("Applying final touches...");
      }, 165000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(93);
        setProgressMessage("Almost done...");
      }, 175000)
    );

    // Cleanup function
    return () => {
      intervals.forEach(clearTimeout);
    };
  }, [isGenerating]);

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      // Fetch the image with no-cors mode to handle CORS issues
      const response = await fetch(generatedImage, {
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const blob = await response.blob();

      // Determine the file extension from the blob type or URL
      let extension = 'png';
      const contentType = blob.type || response.headers.get('content-type');

      if (contentType) {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          extension = 'jpg';
        } else if (contentType.includes('png')) {
          extension = 'png';
        } else if (contentType.includes('webp')) {
          extension = 'webp';
        } else if (contentType.includes('gif')) {
          extension = 'gif';
        }
      }

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `generated-image-${Date.now()}.${extension}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Image downloaded successfully!",
      });
    } catch (error) {
      console.error("Error downloading image:", error);
      try {
        window.open(generatedImage, '_blank');
        toast({
          title: "Opening image",
          description: "Image opened in a new tab. You can right-click to save it.",
        });
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to download image. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    // Check if user has sufficient balance
    const currentPrice = getCurrentPrice();
    if (userBalance === null || userBalance < currentPrice) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${currentPrice.toFixed(2)} to generate this image. Please top up your account.`,
        variant: "destructive",
      });
      return;
    }

    setGeneratedImage(null);
    setIsGenerating(true);
    try {
      toast({
        title: "Processing",
        description: "Your image is being generated...",
      });
      const response = await fetch("/api/generateImage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }
      if (data.success === false) {
        toast({
          title: "Generation Failed",
          description:
            data.message || "Image generation failed, please try again later",
          variant: "destructive",
        });
        setGeneratedImage(null);
        return;
      }
      if (data.imageUrl && typeof data.imageUrl === "string") {
        setProgress(100);
        setProgressMessage("Complete!");
        setGeneratedImage(data.imageUrl);

        // Note: Charging is now handled automatically by the API
        const currentPrice = getCurrentPrice();
        toast({
          title: "Success",
          description: `Image generated successfully! $${currentPrice.toFixed(2)} charged.`,
        });

        // Refresh balance to reflect the charge
        fetchUserBalance();
      } else {
        throw new Error("No image URL found in response");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate image. Please try again.",
        variant: "destructive",
      });
      setGeneratedImage(null);
    } finally {
      setIsGenerating(false);
      // Refresh generations list
      fetchGenerations();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Generate Images</h1>
        <p className="text-muted-foreground">
          Create stunning AI-generated images from text prompts
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Image Parameters</CardTitle>
            <CardDescription>
              Configure your image generation settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the image you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Image Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pricing.length > 0 ? (
                    pricing.map((p) => (
                      <SelectItem key={p.size_key} value={p.size_key}>
                        {p.size_key} - ${p.price.toFixed(2)}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="512x512">512 × 512</SelectItem>
                      <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                      <SelectItem value="1024x1792">
                        1024 × 1792 (Portrait)
                      </SelectItem>
                      <SelectItem value="1792x1024">
                        1792 × 1024 (Landscape)
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Balance and Pricing Display */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Your Balance:</span>
                <span className="text-lg font-semibold">
                  {userBalance === null ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    `$${userBalance.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Generation Cost:</span>
                <span className="text-lg font-semibold text-primary">
                  ${getCurrentPrice().toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Balance After:</span>
                  <span className="text-lg font-bold">
                    {userBalance === null ? (
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    ) : (
                      `$${Math.max(0, userBalance - getCurrentPrice()).toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || userBalance === null || userBalance < getCurrentPrice()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : userBalance !== null && userBalance < getCurrentPrice() ? (
                "Insufficient Balance"
              ) : (
                "Generate Image"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Image</CardTitle>
            <CardDescription>
              Your AI-generated result will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </Button>
              </div>
            ) : (
              <div className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground p-8">
                {isGenerating ? (
                  <div className="w-full max-w-md space-y-6">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                    <div className="space-y-2">
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-center font-medium">
                        {progressMessage}
                      </p>
                      <p className="text-xs text-center text-muted-foreground">
                        {progress}% complete
                      </p>
                    </div>
                  </div>
                ) : (
                  <p>No image generated yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generations History */}
      <Card>
        <CardHeader>
          <CardTitle>Generation History</CardTitle>
          <CardDescription>
            Your recent image generations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGenerations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No generations yet. Create your first image above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Date</TableHead>
              
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generations.map((gen) => (
                    <TableRow key={gen.id}>
                      <TableCell>
                        {gen.status === "completed" && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {gen.status === "generating" && (
                          <Badge variant="secondary">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generating
                          </Badge>
                        )}
                        {gen.status === "failed" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                        {gen.status === "pending" && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={gen.prompt}>
                        {gen.prompt}
                      </TableCell>
                      <TableCell>{gen.size}</TableCell>
                      <TableCell>${gen.cost.toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(gen.created_at).toLocaleDateString()}{" "}
                        {new Date(gen.created_at).toLocaleTimeString()}
                      </TableCell>
                      
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
