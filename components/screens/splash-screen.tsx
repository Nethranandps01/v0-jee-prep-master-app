"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app-context";
import { Zap } from "lucide-react";

export function SplashScreen() {
  const { navigate } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("onboarding");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="animate-scale-in flex flex-col items-center gap-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-primary animate-pulse-glow">
          <Zap className="h-12 w-12 text-primary-foreground" />
          <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-accent" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            JPM
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            AI-Powered JEE Mastery
          </p>
        </div>
        <div className="mt-8 flex items-center gap-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
      <p className="absolute bottom-8 text-xs text-muted-foreground">
        Preparing your learning experience...
      </p>
    </div>
  );
}
