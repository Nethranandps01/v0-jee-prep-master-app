"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { sampleLibrary } from "@/lib/sample-data";
import {
  BookOpen,
  Download,
  CheckCircle2,
  Search,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export function StudentLibraryScreen() {
  const { studentYear } = useApp();
  const year = studentYear || "12th";
  const [activeSubject, setActiveSubject] = useState("All");
  const [search, setSearch] = useState("");

  const subjectSuffix = year === "11th" ? "1" : "2";
  const subjects = ["All", `Physics ${subjectSuffix}`, `Chemistry ${subjectSuffix}`, `Mathematics ${subjectSuffix}`];

  const filtered = sampleLibrary.filter((item) => {
    if (item.year !== year && item.subject !== "All") return false;
    const matchSubject =
      activeSubject === "All" ||
      item.subject === activeSubject.replace(` ${subjectSuffix}`, "") ||
      item.subject === "All";
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground">
          {year} Class - Study materials and resources
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Subject Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.map((subject) => (
          <button
            key={subject}
            onClick={() => setActiveSubject(subject)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeSubject === subject
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      {/* Material List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No materials found</p>
          </div>
        )}
        {filtered.map((item, index) => (
          <div
            key={item.id}
            className="animate-fade-in flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                item.subject === "Physics"
                  ? "bg-primary/10"
                  : item.subject === "Chemistry"
                  ? "bg-accent/10"
                  : item.subject === "Mathematics"
                  ? "bg-warning/10"
                  : "bg-muted"
              }`}
            >
              {item.type === "PDF" ? (
                <FileText
                  className={`h-6 w-6 ${
                    item.subject === "Physics"
                      ? "text-primary"
                      : item.subject === "Chemistry"
                      ? "text-accent"
                      : "text-warning"
                  }`}
                />
              ) : (
                <BookOpen className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                {item.title}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {item.subject}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.chapters} chapters
                </span>
              </div>
            </div>
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                item.downloaded
                  ? "bg-accent/15"
                  : "bg-primary/10 hover:bg-primary/20"
              }`}
              aria-label={item.downloaded ? "Downloaded" : "Download"}
            >
              {item.downloaded ? (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              ) : (
                <Download className="h-5 w-5 text-primary" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
