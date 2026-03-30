"use client";

import React from "react";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function ChatHeader() {
  return (
    <div className="flex-none px-6 pt-5 pb-3">
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
            <h1 className="text-2xl font-serif font-bold text-green-800 leading-tight">
              Kiduka AI Assistant
            </h1>
            <p className="text-sm text-green-600 font-serif">
              Agricultural intelligence for your farm
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-green-700 border-green-200 bg-green-50 text-xs font-medium gap-1.5 h-7"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
          Online
        </Badge>
      </motion.div>
      <Separator className="mt-4 bg-green-100" />
    </div>
  );
}
