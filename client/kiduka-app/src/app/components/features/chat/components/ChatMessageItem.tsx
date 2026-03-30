"use client";

import React from "react";
import { User, Bot, Check, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatMessageItemProps {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  formatRelativeTime: (date: Date) => string;
}

export function ChatMessageItem({
  id,
  role,
  text,
  timestamp,
  copiedId,
  copyToClipboard,
  formatRelativeTime,
}: ChatMessageItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex gap-3",
        role === "user" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center border",
            role === "user"
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-green-50 border-green-200 text-green-700"
          )}
        >
          {role === "user" ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[78%]",
          role === "user" ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "group relative rounded-2xl px-4 py-3 text-sm leading-relaxed",
            role === "user"
              ? "bg-green-600 text-white rounded-tr-sm shadow-sm"
              : "bg-white/90 text-gray-800 border border-green-100/80 rounded-tl-sm shadow-sm"
          )}
        >
          <p className="whitespace-pre-wrap">{text}</p>

          {role === "assistant" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyToClipboard(text, id)}
                  className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-green-100 rounded-lg text-green-600"
                >
                  {copiedId === id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {copiedId === id ? "Copied!" : "Copy"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <span className="text-[10px] text-green-700/50 font-medium px-1">
          {formatRelativeTime(timestamp)}
        </span>
      </div>
    </motion.div>
  );
}
