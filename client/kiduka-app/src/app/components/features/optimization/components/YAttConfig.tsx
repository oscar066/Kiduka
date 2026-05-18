"use client"

import React, { useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface YAttConfigData {
  source: "kephis" | "wofost";
  kephis_quantile: number;
  wofost_sowing_date: string;
  wofost_elevation_m: number | null;
  fallback_to_kephis: boolean;
  location: { lat: number; lon: number } | null;
}

export const DEFAULT_YATT_CONFIG: YAttConfigData = {
  source: "kephis",
  kephis_quantile: 0.01,
  wofost_sowing_date: "2024-03-15",
  wofost_elevation_m: null,
  fallback_to_kephis: true,
  location: null,
};

interface YAttConfigProps {
  config: YAttConfigData;
  onChange: (updated: YAttConfigData) => void;
  locationPrefilled?: boolean;
}

export function YAttConfig({ config, onChange, locationPrefilled }: YAttConfigProps) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<YAttConfigData>) =>
    onChange({ ...config, ...patch });

  const updateLocation = (key: "lat" | "lon", value: number) =>
    onChange({
      ...config,
      location: { lat: config.location?.lat ?? 0, lon: config.location?.lon ?? 0, [key]: value },
    });

  return (
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader
        className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-800 text-base font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-green-600" />
            Advanced Settings
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {config.source === "kephis"
                ? `KEPHIS · Q${(config.kephis_quantile * 100).toFixed(0)}%`
                : `WOFOST · ${config.wofost_sowing_date}`}
            </span>
            {open ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="p-5 space-y-5">
          {/* Yield source */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Attainable Yield Source
            </Label>
            <Select
              value={config.source}
              onValueChange={(v) => update({ source: v as "kephis" | "wofost" })}
            >
              <SelectTrigger className="h-9 border-amber-200 focus:ring-green-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kephis">
                  KEPHIS — Busia district yield trial data
                </SelectItem>
                <SelectItem value="wofost">
                  WOFOST — Process-based crop model
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KEPHIS-only: quantile */}
          {config.source === "kephis" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                KEPHIS Quantile
                <span className="text-xs text-gray-400 font-normal ml-1">
                  (1 = max recorded yield, 0.01 = conservative)
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  value={config.kephis_quantile}
                  onChange={(e) => update({ kephis_quantile: Number(e.target.value) })}
                  className="h-9 w-28 border-amber-200 focus-visible:ring-green-400"
                />
                <span className="text-sm text-gray-500">
                  = {(config.kephis_quantile * 100).toFixed(0)}th percentile
                </span>
              </div>
            </div>
          )}

          {/* WOFOST-only: sowing date, elevation, location */}
          {config.source === "wofost" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Sowing Date
                  </Label>
                  <Input
                    type="date"
                    value={config.wofost_sowing_date}
                    onChange={(e) => update({ wofost_sowing_date: e.target.value })}
                    className="h-9 border-amber-200 focus-visible:ring-green-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Elevation <span className="text-xs text-gray-400 font-normal">(m, optional)</span>
                  </Label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    placeholder="e.g. 1200"
                    value={config.wofost_elevation_m ?? ""}
                    onChange={(e) =>
                      update({ wofost_elevation_m: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className="h-9 border-amber-200 focus-visible:ring-green-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium text-gray-700">
                    Site Location
                    <span className="text-xs text-red-400 font-normal ml-1">(required for WOFOST)</span>
                  </Label>
                  {locationPrefilled && config.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <MapPin className="h-3 w-3" />
                      From your latest analysis
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Latitude</Label>
                    <Input
                      type="number"
                      step={0.0001}
                      min={-90}
                      max={90}
                      placeholder="e.g. 0.4641"
                      value={config.location?.lat ?? ""}
                      onChange={(e) => updateLocation("lat", Number(e.target.value))}
                      className="h-9 border-amber-200 focus-visible:ring-green-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Longitude</Label>
                    <Input
                      type="number"
                      step={0.0001}
                      min={-180}
                      max={180}
                      placeholder="e.g. 34.1112"
                      value={config.location?.lon ?? ""}
                      onChange={(e) => updateLocation("lon", Number(e.target.value))}
                      className="h-9 border-amber-200 focus-visible:ring-green-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="fallback"
                  checked={config.fallback_to_kephis}
                  onCheckedChange={(v) => update({ fallback_to_kephis: !!v })}
                  className="data-[state=checked]:bg-green-700 data-[state=checked]:border-green-700"
                />
                <Label htmlFor="fallback" className="text-sm text-gray-700 cursor-pointer">
                  Fall back to KEPHIS for crops without WOFOST parameters
                </Label>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
