"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import {
  Zap,
  BookOpen,
  BarChart3,
  GraduationCap,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const slides = [
  {
    icon: Zap,
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
    color: "bg-warning",
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
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-12">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">JPM</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground"
        >
          Skip
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <div
          key={currentSlide}
          className="animate-fade-in flex flex-col items-center gap-8 text-center"
        >
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-[2rem] ${slide.color}`}
          >
            <Icon className="h-14 w-14 text-primary-foreground" />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold text-foreground text-balance">
              {slide.title}
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              {slide.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 px-8 pb-12">
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <Button
          onClick={handleNext}
          className="w-full max-w-sm gap-2 rounded-2xl bg-primary py-6 text-base font-semibold text-primary-foreground"
          size="lg"
        >
          {currentSlide === slides.length - 1 ? (
            <>
              Get Started
              <ArrowRight className="h-5 w-5" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
