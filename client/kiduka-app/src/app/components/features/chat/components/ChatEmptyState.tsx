"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon?: React.ReactNode;
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
        <Sparkles className="h-9 w-9 text-green-600" />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-serif font-bold text-green-900 tracking-tight">
          How can I help you today?
        </h3>
        <p className="text-sm text-green-700/70 leading-relaxed font-serif max-w-md">
          Ask me about soil analysis, fertilizer recommendations,
          crop planning, or any agricultural question.
        </p>
      </div>

      {/* Suggestion chips — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
        {suggestedPrompts.map(({ label, prompt, icon }) => (
          <Button
            key={label}
            variant="outline"
            className="flex flex-col items-center justify-center text-center gap-2.5 h-28 border-amber-200 hover:border-green-300 hover:bg-green-50/80 text-green-800 bg-white rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm whitespace-normal"
            onClick={() => onSendMessage(prompt)}
          >
            <span className="p-2 bg-green-50 rounded-lg border border-green-100 text-green-600">
              {icon ?? <span className="h-4 w-4 rounded-full bg-green-500" />}
            </span>
            <span className="text-xs leading-snug px-1 text-green-800">{label}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
