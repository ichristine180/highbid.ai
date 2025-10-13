"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Loader2, Download } from "lucide-react";

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

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

      // Fallback: Open image in new tab if direct download fails
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
        setGeneratedImage(data.imageUrl);
        toast({
          title: "Success",
          description: "Image generated successfully!",
        });
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
                  <SelectItem value="512x512">512 × 512</SelectItem>
                  <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                  <SelectItem value="1024x1792">
                    1024 × 1792 (Portrait)
                  </SelectItem>
                  <SelectItem value="1792x1024">
                    1792 × 1024 (Landscape)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
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
              <div className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                {isGenerating ? (
                  <Loader2 className="h-12 w-12 animate-spin" />
                ) : (
                  <p>No image generated yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
