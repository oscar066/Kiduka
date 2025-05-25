"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Navbar } from "./navbar"
import { SoilHealthCard } from "./soil-health-card"
import { FertilizerRecommendation } from "./fertilizer-recommendation"
import { NutrientGauge } from "./nutrient-gauge"
import { Beaker, Leaf, Zap, Droplets, Mountain, Atom, Sparkles, FileText, TrendingUp } from "lucide-react"

interface SoilInput {
  simplified_texture: string
  ph: number
  n: number
  p: number
  k: number
  o: number
  ca: number
  mg: number
  cu: number
  fe: number
  zn: number
}

interface SoilOutput {
  soil_fertility_status: string
  soil_fertility_confidence: number
  fertilizer_recommendation: string
  fertilizer_confidence: number
  explanation: string
  recommendations: string[]
  timestamp: string
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
  })

  const [results, setResults] = useState<SoilOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  

  const handleInputChange = (field: keyof SoilInput, value: string | number) => {
    setSoilData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePredict = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://0.0.0.0:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(soilData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const apiResults = await response.json()
      
      // Add timestamp if not provided by API
      const resultsWithTimestamp: SoilOutput = {
        ...apiResults,
        timestamp: apiResults.timestamp || new Date().toISOString(),
      }

      setResults(resultsWithTimestamp)
    } catch (err) {
      console.error('Error calling API:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing soil data')
    } finally {
      setIsLoading(false)
    }
  }

  const nutrientData = results
    ? [
        {
          name: "Nitrogen",
          value: soilData.n,
          unit: "mg/kg",
          optimal: { min: 40, max: 60 },
          icon: <Leaf className="h-4 w-4 text-green-600" />,
        },
        {
          name: "Phosphorus",
          value: soilData.p,
          unit: "mg/kg",
          optimal: { min: 30, max: 50 },
          icon: <Zap className="h-4 w-4 text-yellow-600" />,
        },
        {
          name: "Potassium",
          value: soilData.k,
          unit: "mg/kg",
          optimal: { min: 150, max: 200 },
          icon: <Mountain className="h-4 w-4 text-purple-600" />,
        },
        {
          name: "Calcium",
          value: soilData.ca,
          unit: "mg/kg",
          optimal: { min: 1000, max: 1500 },
          icon: <Droplets className="h-4 w-4 text-blue-600" />,
        },
        {
          name: "Magnesium",
          value: soilData.mg,
          unit: "mg/kg",
          optimal: { min: 200, max: 300 },
          icon: <Sparkles className="h-4 w-4 text-pink-600" />,
        },
        {
          name: "Organic Content",
          value: soilData.o,
          unit: "%",
          optimal: { min: 3, max: 5 },
          icon: <Atom className="h-4 w-4 text-amber-600" />,
        },
      ]
    : []

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar />

        <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-green-800">Soil Fertility Analysis</h1>
            <p className="text-green-600">Comprehensive soil health assessment and fertilizer recommendations</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="lg:col-span-1">
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Beaker className="h-5 w-5" />
                    Soil Analysis Input
                  </CardTitle>
                  <CardDescription className="text-green-600">
                    Enter your soil test results for comprehensive analysis
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
                        Nutrients
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
                        <Select onValueChange={(value) => handleInputChange("simplified_texture", value)}>
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
                          className="border-amber-200 focus:border-green-500"
                          onChange={(e) => handleInputChange("ph", Number.parseFloat(e.target.value) || 0)}
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
                          className="border-amber-200 focus:border-green-500"
                          onChange={(e) => handleInputChange("o", Number.parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="nutrients" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { key: "n", label: "Nitrogen (N)", placeholder: "45.5" },
                          { key: "p", label: "Phosphorus (P)", placeholder: "35.2" },
                          { key: "k", label: "Potassium (K)", placeholder: "180.0" },
                          { key: "ca", label: "Calcium (Ca)", placeholder: "1250" },
                          { key: "mg", label: "Magnesium (Mg)", placeholder: "220" },
                        ].map((nutrient) => (
                          <div key={nutrient.key} className="space-y-2">
                            <Label className="text-green-700 font-medium">{nutrient.label} (mg/kg)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder={nutrient.placeholder}
                              className="border-amber-200 focus:border-green-500"
                              onChange={(e) =>
                                handleInputChange(
                                  nutrient.key as keyof SoilInput,
                                  Number.parseFloat(e.target.value) || 0,
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
                          { key: "cu", label: "Copper (Cu)", placeholder: "1.8" },
                          { key: "fe", label: "Iron (Fe)", placeholder: "45.0" },
                          { key: "zn", label: "Zinc (Zn)", placeholder: "2.2" },
                        ].map((micronutrient) => (
                          <div key={micronutrient.key} className="space-y-2">
                            <Label className="text-green-700 font-medium">{micronutrient.label} (mg/kg)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder={micronutrient.placeholder}
                              className="border-amber-200 focus:border-green-500"
                              onChange={(e) =>
                                handleInputChange(
                                  micronutrient.key as keyof SoilInput,
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button
                    onClick={handlePredict}
                    className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading || !soilData.simplified_texture}
                  >
                    {isLoading ? "Analyzing Soil..." : "Analyze Soil Health"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-2 space-y-6">
              {results ? (
                <>
                  {/* Status Cards */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <SoilHealthCard
                      status={results.soil_fertility_status}
                      confidence={results.soil_fertility_confidence}
                      texture={soilData.simplified_texture}
                      ph={soilData.ph}
                    />
                    <FertilizerRecommendation
                      fertilizer={results.fertilizer_recommendation}
                      confidence={results.fertilizer_confidence}
                      timestamp={results.timestamp}
                    />
                  </div>

                  {/* Nutrient Analysis */}
                  <Card className="border-amber-200 bg-white shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <TrendingUp className="h-5 w-5" />
                        Nutrient Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {nutrientData.map((nutrient) => (
                          <NutrientGauge key={nutrient.name} {...nutrient} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Recommendations */}
                  <Card className="border-amber-200 bg-white shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <FileText className="h-5 w-5" />
                        Detailed Analysis & Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
                          <Beaker className="h-4 w-4" />
                          Soil Analysis Summary
                        </h4>
                        <p className="text-blue-800 text-sm leading-relaxed">{results.explanation}</p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-green-800 text-lg">Action Items:</h4>
                        <div className="grid gap-3">
                          {results.recommendations.map((rec, index) => (
                            <div
                              key={index}
                              className="bg-gradient-to-r from-amber-50 to-green-50 p-4 rounded-lg border border-amber-200 shadow-sm"
                            >
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {rec.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^\d+\.\s*/, "")}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-amber-200 bg-white shadow-lg">
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center space-y-4">
                      <Leaf className="h-12 w-12 text-green-400 mx-auto" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Ready for Analysis</h3>
                        <p className="text-gray-500">Enter your soil parameters to get started</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
