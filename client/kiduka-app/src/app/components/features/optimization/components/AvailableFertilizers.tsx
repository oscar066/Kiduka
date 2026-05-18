"use client"

import React from "react";
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight 
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FertilizerEntry, NutrientTag } from "./OptimizationHelpers";

interface AvailableFertilizersProps {
  fertilizers: FertilizerEntry[];
  expandedIdx: number | null;
  onToggleEnabled: (idx: number) => void;
  onToggleExpand: (idx: number) => void;
  onAddCustom: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: keyof FertilizerEntry, value: any) => void;
}

export function AvailableFertilizers({
  fertilizers,
  expandedIdx,
  onToggleEnabled,
  onToggleExpand,
  onAddCustom,
  onRemove,
  onUpdate,
}: AvailableFertilizersProps) {
  const enabledCount = fertilizers.filter((f) => f.enabled).length;

  return (
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-green-800 text-base font-semibold">
              <FlaskConical className="h-4 w-4 text-green-600" />
              Available Fertilizers
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs text-gray-500">
              {enabledCount} of {fertilizers.length} selected — click a row to edit
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddCustom}
                  className="h-8 border-green-200 bg-white text-green-700 hover:bg-green-50 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Custom
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a custom fertilizer product</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[380px]">
          <ul className="divide-y divide-amber-100">
            {fertilizers.map((fert, idx) => {
              const isOpen = expandedIdx === idx;
              return (
                <li key={idx} className="group">
                  {/* compact row */}
                  <div
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                      isOpen ? "bg-white" : "hover:bg-amber-50/50"
                    }`}
                  >
                    {/* checkbox */}
                    <Checkbox
                      id={`fert-${idx}`}
                      checked={fert.enabled}
                      onCheckedChange={() => onToggleEnabled(idx)}
                      className="data-[state=checked]:bg-green-700 data-[state=checked]:border-green-700 shrink-0"
                    />

                    {/* name + nutrient tags */}
                    <button
                      type="button"
                      onClick={() => onToggleExpand(idx)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-medium truncate ${
                            fert.enabled
                              ? "text-gray-800"
                              : "text-gray-400 line-through"
                          }`}
                        >
                          {fert.product}
                        </span>
                        {fert.isCustom && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5 bg-amber-100 text-amber-700 border border-amber-200"
                          >
                            Custom
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <NutrientTag label="N" value={Math.round(fert.n_fraction * 100)} />
                        <NutrientTag label="P₂O₅" value={Math.round(fert.p2o5_fraction * 100)} />
                        <NutrientTag label="K₂O" value={Math.round(fert.k2o_fraction * 100)} />
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                          KES {fert.price_currency_per_kg.toLocaleString()}/kg
                        </span>
                      </div>
                    </button>

                    {/* expand toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleExpand(idx)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                      aria-label={isOpen ? "Collapse" : "Expand details"}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {/* remove */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(idx)}
                            className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove fertilizer</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* expanded edit panel */}
                  {isOpen && (
                    <div className="px-5 pb-4 pt-2 bg-white border-t border-gray-50">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-500">
                            Product Name
                          </Label>
                          <Input
                            value={fert.product}
                            onChange={(e) =>
                              onUpdate(idx, "product", e.target.value)
                            }
                            className="h-8 text-sm mt-1 border-amber-200 focus-visible:ring-green-400"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            Price per kg (KES)
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={fert.price_currency_per_kg}
                            onChange={(e) =>
                              onUpdate(
                                idx,
                                "price_currency_per_kg",
                                Number(e.target.value)
                              )
                            }
                            className="h-8 text-sm mt-1 border-amber-200 focus-visible:ring-green-400"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">N (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={Math.round(fert.n_fraction * 100 * 10) / 10}
                            onChange={(e) =>
                              onUpdate(idx, "n_fraction", Number(e.target.value) / 100)
                            }
                            className="h-8 text-sm mt-1 border-amber-200 focus-visible:ring-green-400"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">P₂O₅ (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={Math.round(fert.p2o5_fraction * 100 * 10) / 10}
                            onChange={(e) =>
                              onUpdate(
                                idx,
                                "p2o5_fraction",
                                Number(e.target.value) / 100
                              )
                            }
                            className="h-8 text-sm mt-1 border-amber-200 focus-visible:ring-green-400"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">K₂O (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={Math.round(fert.k2o_fraction * 100 * 10) / 10}
                            onChange={(e) =>
                              onUpdate(idx, "k2o_fraction", Number(e.target.value) / 100)
                            }
                            className="h-8 text-sm mt-1 border-amber-200 focus-visible:ring-green-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {fertilizers.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-6">
              No fertilizers — defaults will apply.
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
