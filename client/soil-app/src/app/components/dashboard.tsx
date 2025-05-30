"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Leaf,
  Beaker,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface SoilInput {
  simplified_texture: string;
  ph: number;
  n: number;
  p: number;
  k: number;
  o: number;
  ca: number;
  mg: number;
  cu: number;
  fe: number;
  zn: number;
}

interface SoilOutput {
  soil_fertility_status: string;
  soil_fertility_confidence: number;
  fertilizer_recommendation: string;
  fertilizer_confidence: number;
  explanation: string;
  recommendations: string[];
  timestamp: string;
}

export default function SoilFertilityDashboard() {
  const [soilData, setSoilData] = useState<SoilInput>({
    simplified_texture: "",
    ph: 0,
    n: 0,
    p: 0,
    k: 0,
    o: 0,
    ca: 0,
    mg: 0,
    cu: 0,
    fe: 0,
    zn: 0,
  });

  const [results, setResults] = useState<SoilOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    field: keyof SoilInput,
    value: string | number
  ) => {
    setSoilData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("http://0.0.0.0:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(soilData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResults = await response.json();

      // Add timestamp if not provided by API
      const resultsWithTimestamp: SoilOutput = {
        ...apiResults,
        timestamp: apiResults.timestamp || new Date().toISOString(),
      };

      setResults(resultsWithTimestamp);
    } catch (err) {
      console.error("Error calling API:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while analyzing soil data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getFertilityStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy":
        return "bg-green-500";
      case "moderately healthy":
        return "bg-yellow-500";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getFertilityStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "moderately healthy":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "poor":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const isFormValid = () => {
    return (
      soilData.simplified_texture &&
      soilData.ph > 0 &&
      soilData.n >= 0 &&
      soilData.p >= 0 &&
      soilData.k >= 0 &&
      soilData.o >= 0 &&
      soilData.ca >= 0 &&
      soilData.mg >= 0 &&
      soilData.cu >= 0 &&
      soilData.fe >= 0 &&
      soilData.zn >= 0
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Leaf className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Soil Fertility Analysis Dashboard
            </h1>
          </div>
          <p className="text-gray-600">
            Predict soil fertility status and get personalized fertilizer
            recommendations
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Soil Parameters Input
              </CardTitle>
              <CardDescription>
                Enter your soil analysis data to get fertility predictions and
                recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Error</h4>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              )}

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="nutrients">Nutrients</TabsTrigger>
                  <TabsTrigger value="micronutrients">Micro</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="texture">Soil Texture</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("simplified_texture", value)
                      }
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="ph">pH Level</Label>
                    <Input
                      id="ph"
                      type="number"
                      step="0.1"
                      placeholder="6.8"
                      onChange={(e) =>
                        handleInputChange(
                          "ph",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organic">Organic Content (%)</Label>
                    <Input
                      id="organic"
                      type="number"
                      step="0.1"
                      placeholder="2.5"
                      onChange={(e) =>
                        handleInputChange(
                          "o",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="nutrients" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nitrogen">Nitrogen (N) - mg/kg</Label>
                      <Input
                        id="nitrogen"
                        type="number"
                        step="0.1"
                        placeholder="45.5"
                        onChange={(e) =>
                          handleInputChange(
                            "n",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phosphorus">Phosphorus (P) - mg/kg</Label>
                      <Input
                        id="phosphorus"
                        type="number"
                        step="0.1"
                        placeholder="35.2"
                        onChange={(e) =>
                          handleInputChange(
                            "p",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="potassium">Potassium (K) - mg/kg</Label>
                      <Input
                        id="potassium"
                        type="number"
                        step="0.1"
                        placeholder="180.0"
                        onChange={(e) =>
                          handleInputChange(
                            "k",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="calcium">Calcium (Ca) - mg/kg</Label>
                      <Input
                        id="calcium"
                        type="number"
                        step="0.1"
                        placeholder="1250"
                        onChange={(e) =>
                          handleInputChange(
                            "ca",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="magnesium">Magnesium (Mg) - mg/kg</Label>
                      <Input
                        id="magnesium"
                        type="number"
                        step="0.1"
                        placeholder="220"
                        onChange={(e) =>
                          handleInputChange(
                            "mg",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="micronutrients" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="copper">Copper (Cu) - mg/kg</Label>
                      <Input
                        id="copper"
                        type="number"
                        step="0.1"
                        placeholder="1.8"
                        onChange={(e) =>
                          handleInputChange(
                            "cu",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="iron">Iron (Fe) - mg/kg</Label>
                      <Input
                        id="iron"
                        type="number"
                        step="0.1"
                        placeholder="45.0"
                        onChange={(e) =>
                          handleInputChange(
                            "fe",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zinc">Zinc (Zn) - mg/kg</Label>
                      <Input
                        id="zinc"
                        type="number"
                        step="0.1"
                        placeholder="2.2"
                        onChange={(e) =>
                          handleInputChange(
                            "zn",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handlePredict}
                className="w-full"
                disabled={isLoading || !isFormValid()}
              >
                {isLoading ? "Analyzing..." : "Analyze Soil"}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          {results && (
            <div className="space-y-6">
              {/* Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Analysis Results
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(results.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFertilityStatusIcon(results.soil_fertility_status)}
                      <span className="font-medium">
                        Soil Fertility Status:
                      </span>
                    </div>
                    <Badge
                      className={getFertilityStatusColor(
                        results.soil_fertility_status
                      )}
                    >
                      {results.soil_fertility_status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confidence Level</span>
                      <span>
                        {Math.round(results.soil_fertility_confidence * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={results.soil_fertility_confidence * 100}
                      className="h-2"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Recommended Fertilizer:
                      </span>
                      <Badge variant="outline">
                        {results.fertilizer_recommendation}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Recommendation Confidence</span>
                        <span>
                          {Math.round(results.fertilizer_confidence * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={results.fertilizer_confidence * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Analysis & Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-blue-900 font-semibold mb-2">
                        Soil Analysis Summary
                      </h4>
                      <p className="text-blue-800 text-sm leading-relaxed">
                        {results.explanation.replace(/### \d+\. /, "")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Detailed Recommendations:
                    </h4>
                    <div className="space-y-2">
                      {results.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                        >
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {rec
                              .replace(/\*\*(.*?)\*\*/g, "$1")
                              .replace(/^\d+\.\s*/, "")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
