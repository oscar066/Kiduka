"use client";

import React from "react";
import { Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatInputProps {
  inputValue: string;
  isSending: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  messagesLength: number;
}

export const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ inputValue, isSending, onInputChange, onKeyDown, onSendMessage, messagesLength }, ref) => {
    return (
      <div className="flex-none px-4 md:px-6 py-4">
        {/* Fade-up gradient */}
        <div className="pointer-events-none absolute bottom-[72px] left-0 right-0 h-10 bg-gradient-to-t from-white/30 to-transparent" />

        <div className="max-w-3xl mx-auto w-full">
          <div className="relative flex items-end gap-2 bg-white/90 border border-amber-200 rounded-2xl px-4 pt-3 pb-3 shadow-sm focus-within:border-amber-400 focus-within:shadow-amber-100/60 transition-all">
            <Textarea
              ref={ref}
              value={inputValue}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder={
                messagesLength === 0
                  ? "Ask anything about your farm or soil…"
                  : "Message Kiduka AI…"
              }
              rows={1}
              className="flex-1 resize-none border-none bg-transparent p-0 text-sm text-gray-800 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[24px] max-h-[160px] leading-relaxed shadow-none"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={onSendMessage}
                  disabled={!inputValue.trim() || isSending}
                  className="h-8 w-8 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 shadow-none flex-shrink-0 transition-all active:scale-95"
                >
                  {isSending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Send (Enter)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
