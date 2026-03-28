"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beaker, Loader2, AlertCircle } from "lucide-react";

// import types
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

  const isFormValid = () => {
    return (
      soilData.ph > 0 &&
      soilData.ph <= 14 &&
      soilData.latitude !== 0 &&
      soilData.longitude !== 0
    );
  };

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Beaker className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-green-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-green-50">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Basic (Required)
            </TabsTrigger>
            <TabsTrigger
              value="nutrients"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Nutrients (Optional)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ph" className="text-green-700 font-medium">
                pH Level <span className="text-red-500 font-bold">*</span>
              </Label>
              <Input
                id="ph"
                type="number"
                step="0.1"
                placeholder="6.8"
                value={soilData.ph || ""}
                className="border-amber-200 focus:border-green-500"
                onChange={(e) => {
                  const val = e.target.value;
                  handleInputChange("ph", val === "" ? undefined : (Number.parseFloat(val) || 0));
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="nutrients" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  key: "organic_carbon" as keyof SoilInput,
                  label: "Organic Carbon",
                  placeholder: "2.5",
                  unit: "%",
                },
                {
                  key: "n" as keyof SoilInput,
                  label: "Nitrogen (N)",
                  placeholder: "0.20",
                  unit: "%",
                },
                {
                  key: "p" as keyof SoilInput,
                  label: "Phosphorus (P)",
                  placeholder: "35.2",
                  unit: "ppm",
                },
                {
                  key: "k" as keyof SoilInput,
                  label: "Potassium (K)",
                  placeholder: "180.0",
                  unit: "ppm",
                },
                {
                  key: "ca" as keyof SoilInput,
                  label: "Calcium (Ca)",
                  placeholder: "1250",
                  unit: "ppm",
                },
                {
                  key: "mg" as keyof SoilInput,
                  label: "Magnesium (Mg)",
                  placeholder: "220",
                  unit: "ppm",
                },
              ].map((nutrient) => (
                <div key={nutrient.key} className="space-y-2">
                  <Label className="text-green-700 font-medium">
                    {nutrient.label} ({nutrient.unit}) <span className="text-gray-400 font-normal italic text-xs">(Optional)</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={nutrient.placeholder}
                    value={soilData[nutrient.key] || ""}
                    className="border-amber-200 focus:border-green-500"
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange(
                        nutrient.key,
                        val === "" ? undefined : (Number.parseFloat(val) || 0)
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={onSubmit}
          className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white"
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
          <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Location detection required for analysis</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}