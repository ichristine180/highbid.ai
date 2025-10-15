"use client";

import { useState, useEffect, useRef } from "react";
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
import { Loader2, Download, Volume2, Play, Pause, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TTSGeneration {
  id: string;
  prompt: string;
  size?: string;
  audio_url: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  cost: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface PricingSetting {
  price: number;
  description: string;
}

export default function TextToSpeech() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [generations, setGenerations] = useState<TTSGeneration[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(true);
  const [pricing, setPricing] = useState<PricingSetting[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Fetch generations
  const fetchGenerations = async () => {
    try {
      const response = await fetch("/api/tts/generations");
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
      const response = await fetch("/api/tts/pricing");
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

  // Get current price per word
  const getPricePerWord = () => {
    const pricingItem = pricing[0];
    return pricingItem?.price || 0.003;
  };

  // Count words in prompt
  const getWordCount = () => {
    if (!prompt.trim()) return 0;
    return prompt.trim().split(/\s+/).length;
  };

  // Get estimated cost based on word count
  const getEstimatedCost = () => {
    return getPricePerWord() * getWordCount();
  };

  // Fetch data on mount
  useEffect(() => {
    fetchGenerations();
    fetchPricing();
    fetchUserBalance();
  }, []);

  // Simulate progress during audio generation
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
        setProgress(15);
        setProgressMessage("Connecting to TTS service...");
      }, 1000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(30);
        setProgressMessage("Processing your text...");
      }, 2000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(50);
        setProgressMessage("Generating speech...");
      }, 3000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(70);
        setProgressMessage("Synthesizing voice...");
      }, 5000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(85);
        setProgressMessage("Finalizing audio...");
      }, 7000)
    );

    intervals.push(
      setTimeout(() => {
        setProgress(95);
        setProgressMessage("Almost done...");
      }, 9000)
    );

    return () => {
      intervals.forEach(clearTimeout);
    };
  }, [isGenerating]);

  const handlePlayPause = () => {
    if (!audioRef.current || !generatedAudio) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!generatedAudio) return;

    try {
      const response = await fetch(generatedAudio, {
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `generated-speech-${Date.now()}.mp3`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Audio downloaded successfully!",
      });
    } catch (error) {
      console.error("Error downloading audio:", error);
      try {
        window.open(generatedAudio, '_blank');
        toast({
          title: "Opening audio",
          description: "Audio opened in a new tab. You can right-click to save it.",
        });
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to download audio. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to convert to speech",
        variant: "destructive",
      });
      return;
    }
    const estimatedCost = getEstimatedCost();
    if (userBalance === null || userBalance < estimatedCost) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${estimatedCost.toFixed(2)} to generate this audio. Please top up your account.`,
        variant: "destructive",
      });
      return;
    }

    setGeneratedAudio(null);
    setIsGenerating(true);
    setIsPlaying(false);

    try {
      toast({
        title: "Processing",
        description: "Your audio is being generated...",
      });

      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate audio");
      }

      if (data.success === false) {
        toast({
          title: "Generation Failed",
          description:
            data.message || "Audio generation failed, please try again later",
          variant: "destructive",
        });
        setGeneratedAudio(null);
        return;
      }

      if (data.audioUrl && typeof data.audioUrl === "string") {
        setProgress(100);
        setProgressMessage("Complete!");
        setGeneratedAudio(data.audioUrl);

        // Note: Charging is now handled automatically by the API
        const actualCost = data.cost || estimatedCost;
        toast({
          title: "Success",
          description: `Audio generated successfully! $${actualCost.toFixed(2)} charged.`,
        });

        // Refresh balance to reflect the charge
        fetchUserBalance();
      } else {
        throw new Error("No audio URL found in response");
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate audio. Please try again.",
        variant: "destructive",
      });
      setGeneratedAudio(null);
    } finally {
      setIsGenerating(false);
      fetchGenerations();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Text to Speech</h1>
        <p className="text-muted-foreground">
          Convert your text into natural-sounding speech with AI
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Speech Parameters</CardTitle>
            <CardDescription>
              Configure your text-to-speech settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Text</Label>
              <Textarea
                id="prompt"
                placeholder="Enter the text you want to convert to speech..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                {prompt.length} characters • {getWordCount()} words
              </p>
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
                <span className="text-sm text-muted-foreground">
                  Cost ({getWordCount()} words × ${getPricePerWord().toFixed(3)}):
                </span>
                <span className="text-lg font-semibold text-primary">
                  ${getEstimatedCost().toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Balance After:</span>
                  <span className="text-lg font-bold">
                    {userBalance === null ? (
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    ) : (
                      `$${Math.max(0, userBalance - getEstimatedCost()).toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || userBalance === null || userBalance < getEstimatedCost()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : userBalance !== null && userBalance < getEstimatedCost() ? (
                "Insufficient Balance"
              ) : (
                "Generate Speech"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Audio</CardTitle>
            <CardDescription>
              Your AI-generated audio will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedAudio ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg border bg-muted flex items-center justify-center p-8">
                  <div className="text-center space-y-4 w-full">
                    <Volume2 className="h-16 w-16 mx-auto text-primary" />
                    <audio
                      ref={audioRef}
                      src={generatedAudio}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full"
                      controls
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground p-8">
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
                  <>
                    <Volume2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>No audio generated yet</p>
                  </>
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
            Your recent text-to-speech generations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGenerations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No generations yet. Create your first speech above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Text</TableHead>
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
