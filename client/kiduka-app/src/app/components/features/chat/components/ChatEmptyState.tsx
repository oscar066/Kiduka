"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SuggestedPrompt {
  label: string;
  prompt: string;
}

interface ChatEmptyStateProps {
  suggestedPrompts: SuggestedPrompt[];
  onSendMessage: (prompt: string) => void;
}

export function ChatEmptyState({ suggestedPrompts, onSendMessage }: ChatEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center space-y-6 pt-10 pb-4"
    >
      <div className="p-4 bg-green-100 rounded-2xl border border-green-200">
        <Sparkles className="h-9 w-9 text-green-600 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h3 className="text-3xl font-serif font-bold text-green-900 tracking-tight">
          How can I help you today?
        </h3>
        <p className="text-sm text-green-700/70 leading-relaxed font-serif max-w-md">
          Ask me about soil analysis, fertilizer recommendations,
          crop planning, or any agricultural question.
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-col gap-2.5 w-full max-w-lg mx-auto">
        {suggestedPrompts.map(({ label, prompt }) => (
          <Button
            key={label}
            variant="outline"
            className="justify-start text-left gap-3 h-auto py-3 px-4 border-green-100 hover:border-green-300 hover:bg-green-50/80 text-green-800 bg-white/80 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm whitespace-normal leading-relaxed"
            onClick={() => onSendMessage(prompt)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0 mt-1" />
            <span className="flex-1">{label}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
