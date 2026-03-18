"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  BarChart3,
  GraduationCap,
  ChevronRight,
  ArrowRight,
  Rocket,
} from "lucide-react";

const slides = [
  {
    icon: Sparkles,
    title: "Ace JEE with AI",
    description:
      "Leverage cutting-edge AI to create personalized study plans, generate smart practice papers, and get instant doubt resolution.",
    color: "bg-primary",
  },
  {
    icon: BookOpen,
    title: "Smart Papers & Feedback",
    description:
      "AI-generated question papers tailored to your weak areas, with detailed solutions and performance analytics after every test.",
    color: "bg-accent",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description:
      "Real-time rank tracking, topic-wise mastery rings, and improvement suggestions to keep you ahead of the competition.",
    color: "bg-secondary",
  },
  {
    icon: GraduationCap,
    title: "Choose Your Role",
    description:
      "Whether you're a student preparing for JEE or a teacher creating test papers, JEE Prep Master has you covered.",
    color: "bg-primary",
  },
];

export function OnboardingScreen() {
  const { navigate } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("auth");
    }
  };

  const handleSkip = () => {
    navigate("auth");
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-500">
      <div className="flex items-center justify-between px-6 pt-12">
        <div className="flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <span className="text-base font-bold tracking-tight">JEE Prep Master</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground hover:bg-muted/50 font-medium"
        >
          Skip
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <div
          key={currentSlide}
          className="animate-fade-in flex flex-col items-center gap-10 text-center"
        >
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-[2.5rem] shadow-xl ${slide.color} ring-4 ring-background shadow-primary/20 transition-all duration-500`}
          >
            <Icon className="h-16 w-16 text-primary-foreground" />
          </div>
          <div className="flex flex-col gap-4 max-w-sm">
            <h2 className="text-3xl font-bold tracking-tight text-balance">
              {slide.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground font-medium">
              {slide.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-8 px-8 pb-14">
        <div className="flex items-center gap-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                idx === currentSlide
                  ? "w-10 bg-primary"
                  : "w-2.5 bg-muted"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <Button
          onClick={handleNext}
          className="w-full max-w-sm h-14 rounded-2xl text-base font-bold shadow-lg transition-all active:scale-95"
          size="lg"
        >
          {currentSlide === slides.length - 1 ? (
            <>
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="ml-1 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
