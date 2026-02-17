"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/lib/app-context";
import {
  ApiError,
  ChatSession, // Import type
  listStudentDoubts,
  streamChatRequest,
  createChatSession,
  listChatSessions,
  getChatSessionMessages,
  deleteChatSession
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, User, Trash2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  isStreaming?: boolean;
}


const suggestedQuestions = [
  "Explain Newton's laws of motion",
  "How to solve quadratic equations?",
  "What is Le Chatelier's principle?",
  "Tips for time management in JEE",
  "What questions can be asked on photons in JEE?",
];

const learningPrompts = [
  "Give me 5 practice questions from this topic.",
  "Now give answer key only.",
  "Show common mistakes and traps for this topic.",
];



function buildDoubtContext(messages: Message[]): string | undefined {
  if (messages.length === 0) {
    return undefined;
  }
  const context = messages
    .slice(-6)
    .map((message) =>
      `${message.role === "user" ? "Student" : "Tutor"}: ${message.content.replace(/\s+/g, " ").trim()}`,
    )
    .join("\n");

  const trimmed = context.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.length > 1800 ? trimmed.slice(trimmed.length - 1800) : trimmed;
}

export function AIChatScreen() {
  const { navigate, role, authToken } = useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load sessions on mount
  useEffect(() => {
    if (!authToken || role !== "student") return;
    listChatSessions(authToken).then(setSessions).catch(console.error);
  }, [authToken, role]);

  const skipLoadRef = useRef(false);

  // Load messages when session changes
  useEffect(() => {
    if (!authToken || !currentSessionId) {
      setMessages([]);
      return;
    }

    if (skipLoadRef.current) {
      skipLoadRef.current = false;
      return;
    }

    getChatSessionMessages(authToken, currentSessionId)
      .then((msgs) => {
        setMessages(msgs.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          isStreaming: false
        })));
      })
      .catch(console.error);
  }, [currentSessionId, authToken]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setIsTyping(false);
    setIsSidebarOpen(false); // Close sidebar on mobile if open
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent selection
    if (!authToken || !confirm("Are you sure you want to delete this chat?")) return;

    try {
      await deleteChatSession(authToken, sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isTyping) return;

    if (!authToken) {
      setError("Login is required to use AI chat.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);

    // Create a placeholder for the AI message
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: "ai",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      let sessionId = currentSessionId;
      if (!sessionId) {
        // Create new session if none exists
        // Use first few words as title
        const title = messageText.slice(0, 30) + (messageText.length > 30 ? "..." : "");
        const newSession = await createChatSession(authToken, title);
        sessionId = newSession.id;
        skipLoadRef.current = true; // Skip reloading messages for this session switch
        setCurrentSessionId(sessionId);
        setSessions(prev => [newSession, ...prev]);
      }

      const context = role === "student" ? buildDoubtContext(messages) : undefined;
      const endpoint = role === "student" ? "/student/doubts/ask" : "/student/chat/ask";
      const body = role === "student"
        ? { query: messageText, context }
        : { query: messageText };

      await streamChatRequest(authToken, endpoint, body, (chunk) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
          )
        );
      }, sessionId);

      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg))
      );

      // Refresh session list to update timestamp/order if needed (optional)
      listChatSessions(authToken).then(setSessions).catch(console.error);

    } catch (err) {
      console.error("Chat Error:", err);
      let detail = "I could not answer right now. Please try again.";
      if (err instanceof ApiError) {
        detail = err.detail;
      } else if (err instanceof Error) {
        detail = err.message;
      }
      setError(detail);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, content: "I could not fetch a response. Please retry in a moment.", isStreaming: false } : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const goBack = () => {
    navigate(role === "teacher" ? "teacher-home" : "student-home");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Removed heavy radial gradient and blur-3xl for mobile performance */}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-background transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">History</h2>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleNewChat} className="mb-4 w-full justify-start gap-2" variant="outline">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">+</span>
            </div>
            New Chat
          </Button>
          <div className="flex-1 overflow-y-auto space-y-1">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`group flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm transition-colors ${currentSessionId === session.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <button
                  onClick={() => handleSessionSelect(session.id)}
                  className="flex-1 truncate text-left"
                >
                  {session.title}
                </button>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                  title="Delete Chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col h-full relative bg-background">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 pb-3 pt-[calc(0.5rem+var(--safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              <span className="sr-only">Toggle History</span>
              {/* Menu Icon */}
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button
              onClick={goBack}
              className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">AI Tutor (JEE)</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isTyping ? <span className="animate-pulse text-primary">Thinking...</span> : "Online"}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="md:hidden rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Exit
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {currentSessionId === null && messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-xl">
                  <Sparkles className="h-10 w-10" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Hey, I'm your AI Tutor!
                </h2>
                <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
                  Ask me about JEE concepts, solve math problems, or get study strategies.
                </p>
              </div>
              <div className="grid w-full max-w-sm gap-3">
                {suggestedQuestions.map((question, i) => (
                  <button
                    key={question}
                    onClick={() => {
                      void handleSend(question);
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-4 text-left text-sm text-foreground shadow-sm transition-all hover:border-primary hover:shadow-md"
                  >
                    <span className="relative z-10">{question}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-200`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${message.role === "ai"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                      }`}>
                      {message.role === "ai" ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4 text-foreground/70" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-7 ${message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card border border-border text-foreground rounded-tl-none"
                        }`}
                    >
                      <p className="whitespace-pre-line">
                        {message.content}
                        {message.isStreaming && <span className="ml-1 inline-block h-4 w-1.5 align-middle bg-primary animate-pulse" />}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {messages.length > 0 && messages[messages.length - 1].role === "ai" && !isTyping && !messages[messages.length - 1].isStreaming && (
                <div className="flex flex-wrap gap-2 pl-12 animate-in fade-in duration-300">
                  {learningPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        void handleSend(prompt);
                      }}
                      className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              {error && (
                <div className="mx-auto rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
              className="flex items-center gap-2 rounded-3xl border border-border bg-background p-2 shadow-lg transition-all focus-within:border-primary focus-within:shadow-xl"
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask detailed JEE doubts..."
                className="flex-1 border-0 bg-transparent px-4 py-2 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="h-10 w-10 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isTyping ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5 ml-0.5" />
                )}
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
