"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  Subject,
  TeacherPaperResponse,
  createTeacherPaper,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Sparkles,
} from "lucide-react";

const difficulties = ["Easy", "Medium", "Hard", "Mixed"] as const;
const examPatterns = ["JEE Main", "JEE Advanced", "Custom"] as const;

const chaptersBySubjectYear: Record<string, Record<string, string[]>> = {
  Physics: {
    "11th": [
      "Units & Measurements",
      "Kinematics",
      "Laws of Motion",
      "Work, Energy & Power",
      "Rotational Motion",
      "Gravitation",
      "Properties of Matter",
      "Thermodynamics",
      "Oscillations",
      "Waves",
    ],
    "12th": [
      "Electric Charges & Fields",
      "Electrostatic Potential",
      "Current Electricity",
      "Magnetism",
      "Electromagnetic Induction",
      "AC Circuits",
      "EM Waves",
      "Ray Optics",
      "Wave Optics",
      "Dual Nature of Radiation",
      "Atoms",
      "Nuclei",
      "Semiconductors",
    ],
  },
  Chemistry: {
    "11th": [
      "Some Basic Concepts",
      "Atomic Structure",
      "Classification of Elements",
      "Chemical Bonding",
      "States of Matter",
      "Thermodynamics",
      "Equilibrium",
      "Redox Reactions",
      "Hydrogen",
      "s-Block Elements",
      "Organic Chemistry Basics",
      "Hydrocarbons",
    ],
    "12th": [
      "Solid State",
      "Solutions",
      "Electrochemistry",
      "Chemical Kinetics",
      "Surface Chemistry",
      "Isolation of Elements",
      "p-Block Elements",
      "d & f Block Elements",
      "Coordination Compounds",
      "Haloalkanes",
      "Alcohols & Phenols",
      "Aldehydes & Ketones",
      "Amines",
      "Biomolecules",
      "Polymers",
    ],
  },
  Mathematics: {
    "11th": [
      "Sets",
      "Relations & Functions",
      "Trigonometric Functions",
      "Complex Numbers",
      "Linear Inequalities",
      "Permutations & Combinations",
      "Binomial Theorem",
      "Sequences & Series",
      "Straight Lines",
      "Conic Sections",
      "Limits & Derivatives",
      "Statistics",
      "Probability",
    ],
    "12th": [
      "Relations & Functions",
      "Inverse Trig Functions",
      "Matrices",
      "Determinants",
      "Continuity & Differentiability",
      "Applications of Derivatives",
      "Integrals",
      "Applications of Integrals",
      "Differential Equations",
      "Vectors",
      "3D Geometry",
      "Linear Programming",
      "Probability",
    ],
  },
};

export function TeacherPaperGeneratorScreen() {
  const { navigate, teacherSubject, authToken } = useApp();
  const lockedSubject = (teacherSubject || "Physics") as Subject;
  const [selectedYear, setSelectedYear] = useState<"11th" | "12th">("12th");
  const [topic, setTopic] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number] | "">("");
  const [pattern, setPattern] = useState<(typeof examPatterns)[number] | "">("");
  const [numQuestions, setNumQuestions] = useState("30");
  const [duration, setDuration] = useState("60");
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdPaper, setCreatedPaper] = useState<TeacherPaperResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableChapters = chaptersBySubjectYear[lockedSubject]?.[selectedYear] || [];

  const canGenerate = useMemo(() => {
    const q = Number(numQuestions);
    const d = Number(duration);
    return Boolean(difficulty && pattern && q >= 5 && d >= 10);
  }, [difficulty, pattern, numQuestions, duration]);

  const toggleChapter = (chapter: string) => {
    setSelectedChapters((prev) =>
      prev.includes(chapter) ? prev.filter((c) => c !== chapter) : [...prev, chapter],
    );
  };

  const handleGenerate = async () => {
    if (!authToken || !canGenerate || isGenerating) return;

    setError(null);
    setIsGenerating(true);

    try {
      const chapterPrefix = selectedChapters.length > 0 ? `${selectedChapters[0]} - ` : "";
      const topicPrefix = topic ? `${topic} - ` : "";
      const paperTitle = `${topicPrefix}${chapterPrefix}${pattern} ${lockedSubject} Practice`;

      const paper = await createTeacherPaper(authToken, {
        title: paperTitle,
        subject: lockedSubject,
        difficulty: difficulty as "Easy" | "Medium" | "Hard" | "Mixed",
        questions: Number(numQuestions),
        duration: Number(duration),
        year: selectedYear,
        topic: topic || undefined,
      });

      setCreatedPaper(paper);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to generate paper.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (createdPaper) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6 animate-scale-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-xl font-bold text-foreground">Paper Generated!</h2>
            <p className="text-sm text-muted-foreground">
              Your paper has been created and saved as draft.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Title</span>
              <span className="text-xs font-medium text-foreground">{createdPaper.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Subject</span>
              <span className="text-xs font-medium text-foreground">{createdPaper.subject}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Year</span>
              <span className="text-xs font-medium text-foreground">{createdPaper.year}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Questions</span>
              <span className="text-xs font-medium text-foreground">{createdPaper.questions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Duration</span>
              <span className="text-xs font-medium text-foreground">{createdPaper.duration} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="text-xs font-medium text-foreground">{createdPaper.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Source</span>
              <span className="text-xs font-medium text-foreground">
                {(createdPaper.question_source || "template").toLowerCase() === "ai"
                  ? "AI Generated"
                  : "Template"}
              </span>
            </div>
          </div>
          {(createdPaper.question_set ?? []).length > 0 && (
            <div className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-foreground">Preview Questions</h3>
              {(createdPaper.question_set ?? []).slice(0, 3).map((question, index) => (
                <div key={`${question.id}-${index}`} className="rounded-lg bg-muted/50 p-2">
                  <p className="text-[11px] font-medium text-foreground">
                    Q{index + 1}. {question.text}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Answer: {String.fromCharCode(65 + question.correct)}
                  </p>
                </div>
              ))}
              {(createdPaper.question_set ?? []).length > 3 && (
                <p className="text-[10px] text-muted-foreground">
                  +{(createdPaper.question_set ?? []).length - 3} more questions in View Papers.
                </p>
              )}
            </div>
          )}
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("teacher-tests")}
              className="flex-1 rounded-xl bg-transparent py-5 text-foreground"
            >
              View Papers
            </Button>
            <Button
              onClick={() => {
                setCreatedPaper(null);
                setSelectedChapters([]);
                setDifficulty("");
                setPattern("");
              }}
              className="flex-1 rounded-xl bg-primary py-5 text-primary-foreground"
            >
              Create Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-bold text-foreground">Generating Paper...</h2>
            <p className="text-sm text-muted-foreground">
              AI is creating {numQuestions} {lockedSubject} questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("teacher-home")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-foreground">AI Paper Generator</h1>
          <p className="text-xs text-muted-foreground">Create custom {lockedSubject} papers with AI</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Subject</Label>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3 opacity-80">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{lockedSubject}</span>
          <span className="ml-auto text-[10px] text-muted-foreground">Locked to your specialization</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Select Year</Label>
        <div className="flex gap-3">
          {(["11th", "12th"] as const).map((yr) => (
            <button
              key={yr}
              onClick={() => {
                setSelectedYear(yr);
                setSelectedChapters([]);
              }}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${selectedYear === yr
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              {yr} Class
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Chapters (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {availableChapters.map((ch) => (
            <button
              key={ch}
              onClick={() => toggleChapter(ch)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${selectedChapters.includes(ch)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Exam Pattern</Label>
        <div className="flex flex-wrap gap-2">
          {examPatterns.map((item) => (
            <button
              key={item}
              onClick={() => setPattern(item)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${pattern === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Difficulty Level</Label>
        <div className="flex flex-wrap gap-2">
          {difficulties.map((item) => (
            <button
              key={item}
              onClick={() => setDifficulty(item)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${difficulty === item
                  ? item === "Easy"
                    ? "bg-accent text-accent-foreground"
                    : item === "Hard"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Number of Questions</Label>
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            className="rounded-xl border-border bg-card text-foreground"
            min="5"
            max="200"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium text-foreground">Duration (minutes)</Label>
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="rounded-xl border-border bg-card text-foreground"
            min="10"
            max="360"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-2">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || !authToken}
          className="w-full gap-2 rounded-2xl bg-primary py-6 text-base font-semibold text-primary-foreground"
          size="lg"
        >
          <Sparkles className="h-5 w-5" />
          Generate {lockedSubject} Paper with AI
        </Button>
      </div>
    </div>
  );
}
