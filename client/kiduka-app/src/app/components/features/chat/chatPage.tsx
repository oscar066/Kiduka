"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import { TooltipProvider } from "@/components/ui/tooltip";

// Modular Components
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInput } from "./components/ChatInput";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
};

const SUGGESTED_PROMPTS = [
  { label: "How do I improve my soil health?", prompt: "How do I improve my soil health?" },
  { label: "What fertilizers do you recommend for my crops?", prompt: "What fertilizers do you recommend for my crops?" },
  { label: "Tell me about my latest soil analysis report", prompt: "Tell me about my latest soil analysis report" },
  { label: "What should I plant this season?", prompt: "What should I plant this season?" },
];

export default function ChatPage() {
  const { token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const msgText = (overrideText ?? inputValue).trim();
    if (!msgText || isSending || !token) return;

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: msgText, timestamp: new Date() },
    ]);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsSending(true);
    setIsTyping(true);

    try {
      const result = await apiClient.chat(msgText, token, threadId);
      if (result.thread_id && !threadId) setThreadId(result.thread_id);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: result.response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  return (
    <SessionGuard message="You need to be logged in to access the AI Chat.">
      <TooltipProvider delayDuration={300}>
        <SidebarProvider>
          <UnifiedSidebar />
          <SidebarInset>
            <Navbar />

            <main className="flex flex-col h-[calc(100vh-64px)] bg-gradient-to-br from-green-25 via-amber-25 to-green-25 overflow-hidden">
              <ChatHeader />

              <ChatMessageList
                messages={messages}
                isTyping={isTyping}
                copiedId={copiedId}
                copyToClipboard={copyToClipboard}
                formatRelativeTime={formatRelativeTime}
                suggestedPrompts={SUGGESTED_PROMPTS}
                onSendMessage={handleSendMessage}
              />

              <ChatInput
                ref={textareaRef}
                inputValue={inputValue}
                isSending={isSending}
                onInputChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onSendMessage={handleSendMessage}
                messagesLength={messages.length}
              />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </SessionGuard>
  );
}