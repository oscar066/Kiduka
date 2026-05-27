import { MessageCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatHeaderProps {
  onClear?: () => void;
  messagesLength?: number;
}

export function ChatHeader({ onClear, messagesLength = 0 }: ChatHeaderProps) {
  return (
    <div className="flex-none px-6 pt-5 pb-3 border-b border-amber-100/70">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl border border-green-200">
            <MessageCircle className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent leading-tight">
              Kiduka AI Assistant
            </h1>
            <p className="text-sm text-green-600 font-serif">
              Agricultural intelligence for your farm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence>
            {messagesLength > 0 && onClear && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClear}
                      className="h-8 w-8 text-green-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-red-600 text-white border-red-700">
                    <p className="text-xs font-medium">Clear conversation</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>

          <Badge
            variant="outline"
            className="text-green-700 border-green-200 bg-green-50 text-xs font-medium gap-1.5 h-7"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            Online
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}
