"use client";

import React, { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2 } from "lucide-react";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatEmptyState } from "./ChatEmptyState";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface SuggestedPrompt {
  label: string;
  prompt: string;
}

interface ChatMessageListProps {
  messages: Message[];
  isTyping: boolean;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  formatRelativeTime: (date: Date) => string;
  suggestedPrompts: SuggestedPrompt[];
  onSendMessage: (prompt: string) => void;
}

export function ChatMessageList({
  messages,
  isTyping,
  copiedId,
  copyToClipboard,
  formatRelativeTime,
  suggestedPrompts,
  onSendMessage,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 min-h-0">
      <ScrollArea className="h-full px-4 md:px-6">
        <div className="max-w-3xl mx-auto w-full py-4 space-y-6">
           <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <ChatEmptyState
                key="empty-state"
                suggestedPrompts={suggestedPrompts}
                onSendMessage={onSendMessage}
              />
            ) : (
              messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  {...msg}
                  copiedId={copiedId}
                  copyToClipboard={copyToClipboard}
                  formatRelativeTime={formatRelativeTime}
                />
              ))
            )}

            {isTyping && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white/90 border border-green-100/80 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 text-green-600 animate-spin" />
                  <span className="text-sm italic text-gray-400">Thinking…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
