"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { ApiError, submitStudentFeedback } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, Send } from "lucide-react";

export function StudentFeedbackScreen() {
  const { navigate, authToken } = useApp();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating <= 0 || submitting) return;

    if (!authToken) {
      setError("Student login is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitStudentFeedback(authToken, {
        rating,
        feedback: feedback.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to submit feedback.");
      }
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15">
          <Star className="h-10 w-10 text-accent" fill="hsl(var(--accent))" />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-bold text-foreground">Thank You!</h2>
          <p className="text-sm text-muted-foreground">
            Your feedback helps us improve JEE Prep Master.
          </p>
        </div>
        <Button
          onClick={() => navigate("student-home")}
          className="rounded-2xl bg-primary px-8 py-5 text-primary-foreground"
        >
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("student-home")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Feedback</h1>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Rate Your Experience</h2>
          <p className="text-sm text-muted-foreground">How was your test experience?</p>
        </div>

        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`h-10 w-10 ${star <= rating ? "text-warning" : "text-muted-foreground/30"}`}
                fill={star <= rating ? "hsl(var(--warning))" : "none"}
              />
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Tell us more about your experience (optional)"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          className="min-h-28 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground"
        />

        {error && (
          <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={() => void handleSubmit()}
          disabled={rating === 0 || submitting}
          className="w-full gap-2 rounded-2xl bg-primary py-5 text-primary-foreground"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </div>
  );
}
