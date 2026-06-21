"use client"

import React from "react";
import { Sprout, Plus, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crop, SUPPORTED_CROPS } from "./OptimizationHelpers";

interface TargetCropsProps {
  crops: Crop[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: keyof Crop, value: any) => void;
}

export function TargetCrops({ crops, onAdd, onRemove, onUpdate }: TargetCropsProps) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-green-600" />
            <span className="text-sm font-serif font-semibold text-green-800">Target Crops</span>
            {crops.length > 0 && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                {crops.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {crops.length === 0
              ? "Add at least one crop to run the optimizer"
              : "Acreage and farm-gate price drive revenue projections"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-8 border-green-200 bg-white text-green-700 hover:bg-green-50 text-xs shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Crop
        </Button>
      </div>

      <ScrollArea className="h-[420px]">
        <div className="divide-y divide-amber-100">
          {crops.map((crop, idx) => (
            <div
              key={idx}
              className="px-5 py-4 space-y-3 hover:bg-amber-50/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-300 select-none">
                  #{idx + 1}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(idx)}
                        className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove crop</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-gray-500">Crop Type</Label>
                  <Select
                    value={crop.crop}
                    onValueChange={(val) => onUpdate(idx, "crop", val)}
                  >
                    <SelectTrigger className="w-full bg-white border-amber-200 focus:ring-green-400 mt-1 h-9">
                      <SelectValue placeholder="Select a crop" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CROPS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Area (Acres)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={crop.area_ac}
                    onChange={(e) => onUpdate(idx, "area_ac", Number(e.target.value))}
                    className="mt-1 h-9 border-amber-200 focus-visible:ring-green-400"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Farm-gate Price / kg (KES)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={crop.grain_price_currency_per_kg}
                    onChange={(e) => onUpdate(idx, "grain_price_currency_per_kg", Number(e.target.value))}
                    className="mt-1 h-9 border-amber-200 focus-visible:ring-green-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {crops.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="p-3 bg-green-50 rounded-full">
              <Sprout className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-sm text-gray-400 italic">No crops added — add at least one to optimize.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
