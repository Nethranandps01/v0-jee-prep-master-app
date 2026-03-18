"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app-context";
import { Rocket } from "lucide-react";

import { theme } from "@/lib/theme";

export function SplashScreen() {
  const { navigate } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("onboarding");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background transition-colors duration-500">
      <div className="animate-scale-in flex flex-col items-center gap-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[32px] bg-primary shadow-[0_0_50px_-12px] shadow-primary/50 animate-pulse-glow">
          <Rocket className="h-12 w-12 text-primary-foreground" />
        </div>
        <div className="flex flex-col items-center gap-2 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tighter text-foreground">
            BrainJEE
          </h1>
          <p className="text-sm font-semibold text-muted-foreground/80 tracking-wide uppercase">
            AI-Powered JEE Mastery
          </p>
        </div>
        <div className="mt-12 flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "200ms" }} />
          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
         <p className="text-xs font-medium text-muted-foreground/60">
           Preparing your learning experience...
         </p>
      </div>
    </div>
  );
}
