"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beaker, Loader2, AlertCircle } from "lucide-react";
import { SoilInput } from "@/types/soil-analysis";

interface SoilInputFormProps {
  soilData: SoilInput;
  onInputChange: (field: keyof SoilInput, value: string | number | undefined) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  showLocationWarning?: boolean;
  title?: string;
  description?: string;
  submitButtonText?: string;
  loadingText?: string;
}

export function SoilInputForm({
  soilData,
  onInputChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  showLocationWarning = false,
  title = "Soil Analysis Input",
  description = "Enter your soil test results for comprehensive analysis",
  submitButtonText = "Analyze Soil Health",
  loadingText = "Analyzing Soil...",
}: SoilInputFormProps) {
  const handleInputChange = (field: keyof SoilInput, value: string | number | undefined) => {
    onInputChange(field, value);
  };

  const isFormValid = () =>
    soilData.ph > 0 && soilData.ph <= 14 && soilData.latitude !== 0 && soilData.longitude !== 0;

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5">
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-green-600" />
          <span className="text-sm font-serif font-semibold text-green-800">{title}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>

      <div className="p-5">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-green-50/50 border border-amber-100 p-1 h-9">
            <TabsTrigger
              value="basic"
              className="text-xs h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Basic (Required)
            </TabsTrigger>
            <TabsTrigger
              value="nutrients"
              className="text-xs h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Nutrients (Optional)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="ph" className="text-sm font-medium text-gray-700">
                pH Level <span className="text-red-500 font-bold">*</span>
              </Label>
              <Input
                id="ph"
                type="number"
                step="0.1"
                placeholder="6.8"
                value={soilData.ph || ""}
                className="border-amber-200 focus-visible:ring-green-400"
                onChange={(e) => {
                  const val = e.target.value;
                  handleInputChange("ph", val === "" ? undefined : (Number.parseFloat(val) || 0));
                }}
              />
              <p className="text-xs text-gray-400">Scale: 0–14 · Ideal for most crops: 6.0–7.0</p>
            </div>
          </TabsContent>

          <TabsContent value="nutrients" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: "organic_carbon" as keyof SoilInput, label: "Organic Carbon", placeholder: "2.5",   unit: "%" },
                { key: "n"             as keyof SoilInput, label: "Nitrogen (N)",    placeholder: "0.20",  unit: "%" },
                { key: "p"             as keyof SoilInput, label: "Phosphorus (P)",  placeholder: "35.2",  unit: "ppm" },
                { key: "k"             as keyof SoilInput, label: "Potassium (K)",   placeholder: "180.0", unit: "ppm" },
                { key: "ca"            as keyof SoilInput, label: "Calcium (Ca)",    placeholder: "1250",  unit: "ppm" },
                { key: "mg"            as keyof SoilInput, label: "Magnesium (Mg)",  placeholder: "220",   unit: "ppm" },
              ].map((nutrient) => (
                <div key={nutrient.key} className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    {nutrient.label}{" "}
                    <span className="text-xs text-gray-400 font-normal">({nutrient.unit})</span>{" "}
                    <span className="text-xs text-gray-400 font-normal italic">Optional</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={nutrient.placeholder}
                    value={soilData[nutrient.key] || ""}
                    className="border-amber-200 focus-visible:ring-green-400"
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange(nutrient.key, val === "" ? undefined : (Number.parseFloat(val) || 0));
                    }}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={onSubmit}
          className="w-full h-11 mt-5 bg-green-600 hover:bg-green-700 text-white font-semibold font-serif shadow-sm transition-all"
          disabled={disabled || isLoading || !isFormValid()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingText}
            </>
          ) : (
            submitButtonText
          )}
        </Button>

        {showLocationWarning && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>Location detection required for analysis</span>
          </div>
        )}
      </div>
    </div>
  );
}
