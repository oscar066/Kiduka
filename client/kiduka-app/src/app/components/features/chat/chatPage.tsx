"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import {
  isCacheValid,
  cache,
  deriveStats,
  type PredictionsData,
  type UserStats,
} from "../../dashboard/components/userDashboardUtils";
import { UserDashboardStatCard as StatCard } from "../../dashboard/components/UserDashboardStatCard";

import {
  BarChart3,
  TrendingUp,
  Calendar,
  Sparkles,
  Leaf,
  MapPin,
  Send,
  MessageCircle,
  RefreshCw,
  Bot
} from "lucide-react";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export default function ChatPage() {
  const { user, token } = useAuth();

  // Dashboard Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const fetchedRef = useRef(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hello! I am your Kiduka AI assistant. How can I help you with your soil analysis or farming practices today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(
    async (force = false) => {
      if (!token) return;

      if (!force && isCacheValid()) {
        const { data } = cache.current!;
        setStats(deriveStats(data));
        setStatsLoading(false);
        return;
      }

      try {
        const response = await apiClient.getPredictionHistory(token, 1, 5);
        const data: PredictionsData = {
          predictions: response.predictions ?? [],
          total: response.total,
        };
        cache.current = { data, timestamp: Date.now() };
        setStats(deriveStats(data));
        setStatsLoading(false);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setStatsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadData();
  }, [loadData]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = inputValue.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: userMsg },
    ]);
    setInputValue("");

    // Simulated reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "I am currently a static preview. Soon I will be powered by our backend LLM to provide deep agricultural insights based on your soil data!",
        },
      ]);
    }, 1000);
  };

  return (
    <SessionGuard message="You need to be logged in to access the AI Chat.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold text-green-800 flex items-center gap-2">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                  Kiduka AI Assistant
                </h1>
                <p className="text-green-600 font-serif mt-1">
                  Chat with our agricultural AI for insights and recommendations
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-green-600"
                onClick={() => {
                  setStatsLoading(true);
                  loadData(true);
                }}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>


            {/* Chat Interface */}
            <Card className="flex-1 flex flex-col border-amber-200 bg-white shadow-lg overflow-hidden min-h-[400px]">
              
              <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-green-600 text-white rounded-tr-sm"
                          : "bg-white border border-green-100 text-gray-800 shadow-sm rounded-tl-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>

              <CardFooter className="p-4 bg-white border-t border-amber-100 shrink-0">
                <form
                  onSubmit={handleSendMessage}
                  className="w-full flex items-center gap-2"
                >
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border-amber-200 focus-visible:ring-green-500 rounded-full px-4"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full bg-green-600 hover:bg-green-700 shrink-0"
                    disabled={!inputValue.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}