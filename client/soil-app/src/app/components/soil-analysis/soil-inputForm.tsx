// components/soil-analysis/SoilInputForm.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beaker, Loader2, AlertCircle } from "lucide-react";

// import types
import { SoilInput } from "@/types/soil-analysis";

interface SoilInputFormProps {
  soilData: SoilInput;
  onInputChange: (field: keyof SoilInput, value: string | number) => void;
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
  const handleInputChange = (field: keyof SoilInput, value: string | number) => {
    onInputChange(field, value);
  };

  const isFormValid = () => {
    return (
      soilData.simplified_texture &&
      soilData.ph > 0 &&
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
          <TabsList className="grid w-full grid-cols-3 bg-green-50">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Basic
            </TabsTrigger>
            <TabsTrigger
              value="nutrients"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Macro
            </TabsTrigger>
            <TabsTrigger
              value="micronutrients"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Micro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="texture" className="text-green-700 font-medium">
                Soil Texture
              </Label>
              <Select
                value={soilData.simplified_texture}
                onValueChange={(value) =>
                  handleInputChange("simplified_texture", value)
                }
              >
                <SelectTrigger className="border-amber-200 focus:border-green-500">
                  <SelectValue placeholder="Select soil texture" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sandy">Sandy</SelectItem>
                  <SelectItem value="Loamy">Loamy</SelectItem>
                  <SelectItem value="Clay">Clay</SelectItem>
                  <SelectItem value="Silty">Silty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ph" className="text-green-700 font-medium">
                pH Level
              </Label>
              <Input
                id="ph"
                type="number"
                step="0.1"
                placeholder="6.8"
                value={soilData.ph || ""}
                className="border-amber-200 focus:border-green-500"
                onChange={(e) =>
                  handleInputChange("ph", Number.parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organic" className="text-green-700 font-medium">
                Organic Content (%)
              </Label>
              <Input
                id="organic"
                type="number"
                step="0.1"
                placeholder="2.5"
                value={soilData.o || ""}
                className="border-amber-200 focus:border-green-500"
                onChange={(e) =>
                  handleInputChange("o", Number.parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="nutrients" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  key: "n" as keyof SoilInput,
                  label: "Nitrogen (N)",
                  placeholder: "45.5",
                },
                {
                  key: "p" as keyof SoilInput,
                  label: "Phosphorus (P)",
                  placeholder: "35.2",
                },
                {
                  key: "k" as keyof SoilInput,
                  label: "Potassium (K)",
                  placeholder: "180.0",
                },
              ].map((nutrient) => (
                <div key={nutrient.key} className="space-y-2">
                  <Label className="text-green-700 font-medium">
                    {nutrient.label} (mg/kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={nutrient.placeholder}
                    value={soilData[nutrient.key] || ""}
                    className="border-amber-200 focus:border-green-500"
                    onChange={(e) =>
                      handleInputChange(
                        nutrient.key,
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="micronutrients" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  key: "ca" as keyof SoilInput,
                  label: "Calcium (Ca)",
                  placeholder: "1250",
                },
                {
                  key: "mg" as keyof SoilInput,
                  label: "Magnesium (Mg)",
                  placeholder: "220",
                },
                {
                  key: "cu" as keyof SoilInput,
                  label: "Copper (Cu)",
                  placeholder: "1.8",
                },
                {
                  key: "fe" as keyof SoilInput,
                  label: "Iron (Fe)",
                  placeholder: "45.0",
                },
                {
                  key: "zn" as keyof SoilInput,
                  label: "Zinc (Zn)",
                  placeholder: "2.2",
                },
              ].map((micronutrient) => (
                <div key={micronutrient.key} className="space-y-2">
                  <Label className="text-green-700 font-medium">
                    {micronutrient.label} (mg/kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={micronutrient.placeholder}
                    value={soilData[micronutrient.key] || ""}
                    className="border-amber-200 focus:border-green-500"
                    onChange={(e) =>
                      handleInputChange(
                        micronutrient.key,
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
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