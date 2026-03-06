"use client";

import Link from "next/link";
import { InteractiveGlobe } from "@/components/ui/interactive-globe";
import { useEffect, useState } from "react";

const EMOTIONS = ["Happy", "Sad", "Angry", "Surprise", "Fear", "Disgust", "Neutral"];
const EMOTION_EMOJIS: Record<string, string> = {
  Happy: "😊",
  Sad: "😢",
  Angry: "😠",
  Surprise: "😲",
  Fear: "😨",
  Disgust: "🤢",
  Neutral: "😐",
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeEmotion, setActiveEmotion] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveEmotion((prev) => (prev + 1) % EMOTIONS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/[0.03] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.03] blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02] blur-[80px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">
            Face<span className="gradient-text-blue">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className="hidden md:inline hover:text-foreground transition-colors cursor-pointer">Features</span>
          <span className="hidden md:inline hover:text-foreground transition-colors cursor-pointer">Architecture</span>
          <span className="hidden md:inline hover:text-foreground transition-colors cursor-pointer">Analytics</span>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-blue-500/20"
          >
            Launch Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center min-h-[calc(100vh-80px)] px-8 lg:px-16 gap-8">
        {/* Left content */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl" style={{ animationDelay: "0.1s" }}>
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI-Powered Emotion Intelligence
            </div>
          </div>

          <h1
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            Facial Expression
            <br />
            <span className="gradient-text">Recognition</span>
            <br />
            & Analysis
          </h1>

          <p
            className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed mb-10 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            Detect and analyze human emotions in real-time using advanced deep
            learning. Multi-person detection, behavior analytics, and
            intelligent alerts — all from your webcam.
          </p>

          {/* Emotion pills */}
          <div
            className="flex flex-wrap gap-2 mb-10 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            {EMOTIONS.map((emotion, i) => (
              <span
                key={emotion}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${i === activeEmotion
                    ? "bg-primary/20 text-primary border border-primary/30 scale-110"
                    : "bg-muted/50 text-muted-foreground border border-transparent"
                  }`}
              >
                {EMOTION_EMOJIS[emotion]} {emotion}
              </span>
            ))}
          </div>

          <div
            className="flex items-center gap-4 animate-slide-up"
            style={{ animationDelay: "0.5s" }}
          >
            <Link
              href="/dashboard"
              className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center gap-2"
            >
              Launch Dashboard
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <span className="text-xs text-muted-foreground">
              No setup required
            </span>
          </div>

          {/* Stats row */}
          <div
            className="flex items-center gap-8 mt-14 animate-slide-up"
            style={{ animationDelay: "0.6s" }}
          >
            <div>
              <p className="text-2xl font-bold">7</p>
              <p className="text-xs text-muted-foreground">Emotions</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-2xl font-bold">Real-Time</p>
              <p className="text-xs text-muted-foreground">Detection</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-2xl font-bold">Multi</p>
              <p className="text-xs text-muted-foreground">Person</p>
            </div>
          </div>
        </div>

        {/* Right — Globe */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Glow behind globe */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/[0.04] blur-[60px] pointer-events-none" />
          <div className="animate-float">
            <InteractiveGlobe size={500} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-8 lg:px-16 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            System <span className="gradient-text-blue">Architecture</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A modular, scalable AI pipeline from image acquisition to behavior analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: "📷",
              title: "Image Acquisition",
              desc: "Real-time webcam capture and video stream processing at 30+ FPS.",
            },
            {
              icon: "🔍",
              title: "Face Detection",
              desc: "OpenCV Haar Cascade & DNN-based detection for robust multi-face tracking.",
            },
            {
              icon: "🧠",
              title: "CNN Classification",
              desc: "Deep learning model trained on FER2013 with 7 emotion classes.",
            },
            {
              icon: "📊",
              title: "Analytics Engine",
              desc: "Real-time emotional distribution, trends, and behavior reports.",
            },
            {
              icon: "👥",
              title: "Multi-Person",
              desc: "Simultaneous detection and emotion assignment for multiple faces.",
            },
            {
              icon: "⚡",
              title: "Real-Time Alerts",
              desc: "Automatic notifications when negative emotion thresholds are exceeded.",
            },
            {
              icon: "💾",
              title: "Data Storage",
              desc: "SQLite database for emotion history, daily reports, and weekly trends.",
            },
            {
              icon: "🎨",
              title: "Visualization",
              desc: "Interactive dashboard with live bounding boxes and emotion overlays.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass-card p-6 hover:border-primary/20 transition-all duration-300 hover:translate-y-[-2px] group"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-8 py-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>FaceAI — AI-Based Facial Expression Recognition System</span>
          <span>Built with TensorFlow, OpenCV, Next.js</span>
        </div>
      </footer>
    </main>
  );
}
