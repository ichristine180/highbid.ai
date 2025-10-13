import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for testing and small projects",
    features: [
      "1,000 images/month",
      "Standard quality models",
      "Community support",
      "Basic API access"
    ],
    cta: "Get Started",
    featured: false
  },
  {
    name: "Professional",
    price: "$49",
    description: "For growing businesses and teams",
    features: [
      "50,000 images/month",
      "HD & Ultra-HD models",
      "Priority support",
      "Advanced API features",
      "Custom model training",
      "99.9% SLA uptime"
    ],
    cta: "Start Free Trial",
    featured: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Tailored solutions for large-scale needs",
    features: [
      "Unlimited images",
      "All premium models",
      "Dedicated support",
      "Custom infrastructure",
      "Private model deployment",
      "Advanced analytics"
    ],
    cta: "Contact Sales",
    featured: false
  }
];

const Pricing = () => {
  return (
    <section className="py-24 px-4 relative">
      <div className="container mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, <span className="bg-gradient-primary bg-clip-text text-transparent">Transparent</span> Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. Scale as you grow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-card/50 backdrop-blur-sm border rounded-lg p-8 animate-slide-up ${
                plan.featured
                  ? "border-primary shadow-glow scale-105 md:scale-110"
                  : "border-border hover:border-primary/50"
              } transition-all duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-sm font-semibold text-primary-foreground">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.featured ? "hero" : "glass"} 
                className="w-full"
                asChild
              >
                <Link href="/auth/signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
