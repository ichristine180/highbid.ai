import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-primary/10 via-background to-accent/10 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
      </div>

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-glow-pulse delay-1000" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border mb-6">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm text-muted-foreground">Powered by Advanced AI Models</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent leading-tight">
          Generate Stunning Images
          <br />
          with AI Magic
        </h1>

        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Access powerful image generation APIs with simple integration. Create, edit, and transform visuals at scale with cutting-edge AI technology.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="hero" size="lg" className="group" asChild>
            <Link href="/auth/signup">
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button variant="glass" size="lg" asChild>
            <Link href="/docs">View Documentation</Link>
          </Button>
        </div>

        {/* Code preview */}
        <div className="mt-16 max-w-3xl mx-auto animate-slide-up">
          <div className="bg-card/70 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/50" />
                <div className="w-3 h-3 rounded-full bg-accent/50" />
                <div className="w-3 h-3 rounded-full bg-primary/50" />
              </div>
              <span className="text-xs text-muted-foreground ml-auto">Quick Start</span>
            </div>
            <pre className="text-left text-sm">
              <code className="text-accent">
                {`const response = await fetch('api.imageai.com/v1/generate', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
  body: JSON.stringify({
    prompt: 'A futuristic cityscape at sunset',
    model: 'ultra-hd-v2'
  })
});`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
