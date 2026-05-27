"use client"

import React from "react";
import { FlaskRound, History, TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SoilData {
  mode: "direct";
  ph: number;
  soc_percent: number;
  p_olsen_ppm: number;
  k_exchangeable_ppm: number;
}

export interface SoilPrefillInfo {
  date: string;
  location?: string | null;
}

interface SoilInputsProps {
  soil: SoilData;
  onChange: (updated: SoilData) => void;
  prefillInfo?: SoilPrefillInfo | null;
}

const FIELDS: {
  key: keyof Omit<SoilData, "mode">;
  label: string;
  unit: string;
  min: number;
  max?: number;
  step: number;
  hint: string;
}[] = [
  { key: "ph",                 label: "pH",          unit: "",     min: 0,   max: 14,  step: 0.1, hint: "Soil pH (0–14)" },
  { key: "soc_percent",        label: "SOC",         unit: "%",    min: 0,             step: 0.1, hint: "Soil organic carbon %" },
  { key: "p_olsen_ppm",        label: "Olsen P",     unit: "ppm",  min: 0,             step: 0.1, hint: "Olsen extractable P (mg/kg)" },
  { key: "k_exchangeable_ppm", label: "Exch. K",     unit: "ppm",  min: 0,             step: 1,   hint: "Exchangeable K (mg/kg)" },
];

// Ranges supported by the RQUEFTS model — values outside are clamped silently.
const RQUEFTS_RANGES: Record<keyof Omit<SoilData, "mode">, { modelMin: number; modelMax: number; displayLabel: string }> = {
  ph:                 { modelMin: 4.5,  modelMax: 7.0,   displayLabel: "pH" },
  soc_percent:        { modelMin: 0,    modelMax: 7,     displayLabel: "Organic C" },
  p_olsen_ppm:        { modelMin: 0,    modelMax: 30,    displayLabel: "Olsen P" },
  k_exchangeable_ppm: { modelMin: 0,    modelMax: 1170,  displayLabel: "Exchangeable K" },
};

function getRangeWarning(key: keyof Omit<SoilData, "mode">, value: number): string | null {
  const { modelMin, modelMax, displayLabel } = RQUEFTS_RANGES[key];
  if (value < modelMin) {
    return `The ${displayLabel} value is outside the normal range (and thus clamped to ${modelMin}). Results may be less accurate.`;
  }
  if (value > modelMax) {
    return `The ${displayLabel} value is outside the normal range (and thus clamped to ${modelMax}). Results may be less accurate.`;
  }
  return null;
}

export function SoilInputs({ soil, onChange, prefillInfo }: SoilInputsProps) {
  const update = (key: keyof Omit<SoilData, "mode">, value: number) =>
    onChange({ ...soil, [key]: value });

  return (
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-green-800 text-base font-semibold">
          <FlaskRound className="h-4 w-4 text-green-600" />
          Soil Analysis
        </CardTitle>
        <CardDescription className="text-xs text-gray-500 mt-0.5">
          {prefillInfo ? (
            <span className="flex items-center gap-1 text-green-700">
              <History className="h-3 w-3 shrink-0" />
              Pre-filled from your latest analysis
              {prefillInfo.location && <span>· {prefillInfo.location}</span>}
              <span className="text-gray-400 ml-1">({prefillInfo.date})</span>
              <span className="text-gray-400">— values are editable</span>
            </span>
          ) : (
            "Enter values from your soil test report"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(({ key, label, unit, min, max, step, hint }) => {
            const warning = getRangeWarning(key, soil[key]);
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`soil-${key}`} className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  {label}
                  {unit && (
                    <span className="text-xs text-gray-400 font-normal">({unit})</span>
                  )}
                </Label>
                <Input
                  id={`soil-${key}`}
                  type="number"
                  step={step}
                  min={min}
                  max={max}
                  value={soil[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className={`h-9 focus-visible:ring-green-400 ${warning ? "border-amber-400" : "border-amber-200"}`}
                  title={hint}
                />
                {warning && (
                  <p className="flex items-start gap-1 text-xs text-amber-700">
                    <TriangleAlert className="h-3 w-3 shrink-0 mt-0.5" />
                    {warning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
