"use client";

import React from "react";
import { User, Bot, Check, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
            "group relative rounded-2xl px-4 py-3 text-base leading-relaxed",
            role === "user"
              ? "bg-green-600 text-white rounded-tr-sm shadow-sm"
              : "bg-white text-gray-800 border border-amber-100 rounded-tl-sm shadow-sm"
          )}
        >
          <div className={cn(
            "flex flex-col gap-2 font-serif",
            role === "assistant" ? "text-green-900" : "text-white"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => (
                  <strong className={cn(
                    "font-bold",
                    role === "assistant" ? "text-green-800" : "text-white underline decoration-white/30"
                  )}>
                    {children}
                  </strong>
                ),
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-3 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-3 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                a: ({ children, href }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={cn(
                      "underline transition-colors",
                      role === "assistant" ? "text-green-700 hover:text-green-900" : "text-white hover:text-green-100"
                    )}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {text}
            </ReactMarkdown>
          </div>

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
