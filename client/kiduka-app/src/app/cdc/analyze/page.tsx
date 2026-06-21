"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { CDCLayout } from "../../components/layout/roleBasedLayout";

// Reuse the exact same analysis components the farmer uses
import { SoilInputForm } from "../../components/features/analysis/components/soil-inputForm";
import { StatusSummaryCards } from "../../components/features/analysis/components/statusSummaryCard";
import { NutrientDisplay } from "../../components/features/analysis/components/nutrientDisplay";
import { AgrovetsDisplay } from "../../components/features/analysis/components/agrovetDisplay";
import { LocationDetector } from "../../components/shared/location-detector";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Beaker,
  CheckCircle2,
  FlaskConical,
  Leaf,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Sprout,
  BarChart3,
  User,
  X,
} from "lucide-react";

import type { SoilInput, PredictionResponse } from "@/types/soil-analysis";

interface FarmerOption {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
}

interface CDCAnalysisResult {
  prediction_id: string;
  farmer_id: string;
  farmer_username: string;
  soil_health_index: number;
  soil_fertility_status: string | null;
  recommendations: string[];
  mentions: unknown[];
  nutrients: Record<string, unknown> | null;
  notification_sent: boolean;
}

export default function CDCAnalyzePage() {
  return (
    <ProtectedPage requiredRole={UserRole.CDC}>
      <CDCLayout>
        <CDCAnalyzeContent />
      </CDCLayout>
    </ProtectedPage>
  );
}

function CDCAnalyzeContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();

  // Farmer selection
  const [farmerSearch, setFarmerSearch] = useState("");
  const [farmerResults, setFarmerResults] = useState<FarmerOption[]>([]);
  const [farmerSearchLoading, setFarmerSearchLoading] = useState(false);
  const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerOption | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Soil analysis — mirrors exactly what the farmer page uses
  const [soilData, setSoilData] = useState<SoilInput>({ ph: 0, latitude: 0, longitude: 0 });
  const [cdcNotes, setCdcNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const [cdcResult, setCdcResult] = useState<CDCAnalysisResult | null>(null);

  // Send results
  const [sendMethod, setSendMethod] = useState<"email" | "sms" | "both">("email");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Pre-select farmer from ?farmer_id= query param (linked from farmers page)
  useEffect(() => {
    const farmerId = searchParams.get("farmer_id");
    if (farmerId && token) {
      loadFarmerById(farmerId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowFarmerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadFarmerById = async (farmerId: string) => {
    if (!token) return;
    try {
      const farmer = await apiClient.getCDCFarmer(farmerId, token);
      setSelectedFarmer(farmer);
    } catch (err) {
      console.error("Failed to load farmer:", err);
    }
  };

  const searchFarmers = useCallback(
    async (query: string) => {
      if (!token || query.trim().length < 1) {
        setFarmerResults([]);
        setShowFarmerDropdown(false);
        return;
      }
      setFarmerSearchLoading(true);
      try {
        const response = await apiClient.getCDCFarmers(token, 1, 8, query);
        setFarmerResults(response.farmers || []);
        setShowFarmerDropdown(true);
      } catch (err) {
        console.error("Farmer search failed:", err);
      } finally {
        setFarmerSearchLoading(false);
      }
    },
    [token]
  );

  const handleFarmerSearchChange = (value: string) => {
    setFarmerSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchFarmers(value), 300);
  };

  const handleSelectFarmer = (farmer: FarmerOption) => {
    setSelectedFarmer(farmer);
    setFarmerSearch("");
    setShowFarmerDropdown(false);
    setResults(null);
    setCdcResult(null);
    setSendSuccess(false);
    setError(null);
  };

  const handleClearFarmer = () => {
    setSelectedFarmer(null);
    setResults(null);
    setCdcResult(null);
    setSendSuccess(false);
    setError(null);
  };

  const handleInputChange = (field: keyof SoilInput, value: string | number | undefined) => {
    setSoilData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationDetected = (lat: number, lng: number, name?: string) => {
    setSoilData((prev) => ({ ...prev, latitude: lat, longitude: lng, location_name: name }));
  };

  const handleFormSubmit = async () => {
    if (!token) { setError("Authentication token not found. Please sign in again."); return; }
    if (!selectedFarmer) { setError("Please select a farmer before running the analysis."); return; }
    if (!soilData.ph || soilData.ph <= 0 || soilData.ph > 14) {
      setError("Please enter a valid pH value (must be between 0 and 14).");
      return;
    }
    if (!soilData.latitude || !soilData.longitude) {
      setError("Please enable location detection or enter coordinates.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setCdcResult(null);
    setSendSuccess(false);

    try {
      // Build payload — drop zero/undefined optional nutrients so the backend
      // triggers ML gap-filling correctly (same logic as the farmer page)
      const payload: Record<string, unknown> = {
        farmer_id: selectedFarmer.id,
        soil_ph: soilData.ph,
        location_lat: soilData.latitude,
        location_lng: soilData.longitude,
        location_name: soilData.location_name,
        cdc_notes: cdcNotes.trim() || undefined,
      };
      const optionalNutrients = ["n", "p", "k", "organic_carbon", "ca", "mg"] as const;
      for (const field of optionalNutrients) {
        const val = soilData[field];
        if (val !== undefined && (val as number) > 0) payload[field] = val;
      }

      const cdcResponse: CDCAnalysisResult = await apiClient.cdcRunAnalysis(
        payload as Parameters<typeof apiClient.cdcRunAnalysis>[0],
        token
      );
      setCdcResult(cdcResponse);

      // Map CDC response → PredictionResponse shape that shared result
      // components (StatusSummaryCards, NutrientDisplay, etc.) expect
      setResults({
        prediction_id: cdcResponse.prediction_id,
        soil_health_index: cdcResponse.soil_health_index,
        soil_fertility_status: cdcResponse.soil_fertility_status,
        initial_soil_fertility_status: cdcResponse.soil_fertility_status,
        recommendations: cdcResponse.recommendations || [],
        mentions: cdcResponse.mentions || [],
        nearest_agrovets: [],
        timestamp: new Date().toISOString(),
        nutrients: cdcResponse.nutrients ?? null,
        confidence_data: null,
      } as unknown as PredictionResponse);

    } catch (err) {
      console.error("CDC analysis error:", err);
      setError(err instanceof Error ? err.message : "An error occurred while analysing soil data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResults = async () => {
    if (!token || !cdcResult) return;

    if (sendMethod === "email" && !selectedFarmer?.email) {
      setSendError("This farmer has no email address on file."); return;
    }
    if (sendMethod === "sms" && !selectedFarmer?.phone_number) {
      setSendError("This farmer has no phone number on file."); return;
    }
    if (sendMethod === "both" && !selectedFarmer?.email && !selectedFarmer?.phone_number) {
      setSendError("This farmer has neither an email nor a phone number on file."); return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      await apiClient.cdcSendResults(
        { prediction_id: cdcResult.prediction_id, method: sendMethod, custom_message: customMessage.trim() || undefined },
        token
      );
      setSendSuccess(true);
      setCdcResult((prev) => prev ? { ...prev, notification_sent: true } : prev);
    } catch (err) {
      console.error("Send results error:", err);
      setSendError(err instanceof Error ? err.message : "Failed to send results");
    } finally {
      setIsSending(false);
    }
  };

  const showLocationWarning = !soilData.latitude || !soilData.longitude;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
          Soil Analysis for Farmer
        </h1>
        <p className="text-green-600 font-serif">
          Select a farmer, detect the field location, then run the soil health assessment
        </p>
      </div>

      {/* Farmer Selector */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <span className="text-sm font-serif font-semibold text-green-800">Select Farmer</span>
          </div>
          {selectedFarmer && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Farmer selected
            </span>
          )}
        </div>

        <div className="p-4">
          {selectedFarmer ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-gradient-to-r from-green-50/60 to-amber-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-green-100 border border-green-200 flex items-center justify-center shrink-0 text-green-700 font-bold text-sm">
                  {(selectedFarmer.full_name || selectedFarmer.username).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-green-900 text-sm truncate">
                    {selectedFarmer.full_name || selectedFarmer.username}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3 w-3 text-green-400" />
                      {selectedFarmer.email}
                    </span>
                    {selectedFarmer.phone_number && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3 text-green-400" />
                        {selectedFarmer.phone_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFarmer}
                className="h-8 w-8 p-0 text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400" />
                {farmerSearchLoading ? (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400 animate-spin" />
                ) : farmerSearch.length > 0 && (
                  <button
                    onClick={() => { setFarmerSearch(""); setShowFarmerDropdown(false); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Input
                  placeholder="Type a name or email to search farmers..."
                  value={farmerSearch}
                  onChange={(e) => handleFarmerSearchChange(e.target.value)}
                  onFocus={() => farmerResults.length > 0 && setShowFarmerDropdown(true)}
                  className="pl-10 pr-10 h-11 border-amber-200 focus-visible:ring-green-500 text-sm"
                />
              </div>

              {showFarmerDropdown && farmerResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1.5 bg-white border border-amber-200 rounded-xl shadow-lg overflow-hidden">
                  <p className="px-3 py-2 text-[10px] font-semibold text-green-700 uppercase tracking-wide bg-green-50/60 border-b border-amber-100">
                    {farmerResults.length} result{farmerResults.length !== 1 ? "s" : ""}
                  </p>
                  {farmerResults.map((farmer) => (
                    <button
                      key={farmer.id}
                      onClick={() => handleSelectFarmer(farmer)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 transition-colors text-left border-b border-amber-50 last:border-0"
                    >
                      <div className="h-8 w-8 rounded-full bg-green-100 border border-green-100 flex items-center justify-center shrink-0 text-green-700 font-semibold text-xs">
                        {(farmer.full_name || farmer.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {farmer.full_name || farmer.username}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{farmer.email}</p>
                      </div>
                      {farmer.phone_number && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full shrink-0">
                          <Phone className="h-2.5 w-2.5" />
                          SMS
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {showFarmerDropdown && !farmerSearchLoading && farmerSearch.length > 0 && farmerResults.length === 0 && (
                <div className="absolute z-50 w-full mt-1.5 bg-white border border-amber-200 rounded-xl shadow-sm px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">No farmers found for <span className="font-medium text-gray-700">&ldquo;{farmerSearch}&rdquo;</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Try a different name or email</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Location Detector */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
          <p className="text-sm font-serif font-semibold text-green-800">
            Field Location <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-green-600 mt-0.5">You must be at the farmer's field for accurate analysis</p>
        </div>
        <div className="p-4">
          <LocationDetector onLocationDetected={handleLocationDetected} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main grid — identical layout to the farmer's analysis page */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">

        {/* Left: soil input form + CDC notes */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-4">
          <SoilInputForm
            soilData={soilData}
            onInputChange={handleInputChange}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
            disabled={!selectedFarmer}
            showLocationWarning={showLocationWarning}
            title="Soil Analysis Input"
            description={
              selectedFarmer
                ? `Analysing for ${selectedFarmer.full_name || selectedFarmer.username}`
                : "Select a farmer above to begin"
            }
            submitButtonText="Run Analysis for Farmer"
            loadingText="Running Analysis..."
          />

          {/* CDC Field Notes */}
          <Card className="border-amber-200 bg-white shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800 text-sm">
                <MessageSquare className="h-4 w-4" />
                Field Observations
                <span className="font-normal text-gray-400 text-xs ml-1">(Optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea
                placeholder="Record your field observations, crop history, visible soil conditions, or notes from the farmer visit..."
                value={cdcNotes}
                onChange={(e) => setCdcNotes(e.target.value)}
                rows={4}
                className="border-amber-200 focus-visible:ring-green-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                These notes will be attached to the analysis record.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: results */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {results && cdcResult ? (
            <>
              <StatusSummaryCards results={results} soilInput={soilData} />

              <NutrientDisplay soilInput={soilData} results={results} showOptimalRanges={true} />

              {results.nearest_agrovets && results.nearest_agrovets.length > 0 && (
                <AgrovetsDisplay
                  agrovets={results.nearest_agrovets}
                  userLat={soilData.latitude}
                  userLng={soilData.longitude}
                />
              )}

              {/* Send Results panel */}
              <Card className="border-amber-200 bg-white shadow-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 pb-4">
                  <CardTitle className="flex items-center gap-2 text-green-800 text-base font-serif">
                    <Send className="h-5 w-5" />
                    Send Results to Farmer
                  </CardTitle>
                  <CardDescription className="text-green-600">
                    Notify {selectedFarmer?.full_name || selectedFarmer?.username} of their results
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {sendSuccess ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-800 text-sm">Results sent successfully!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          The farmer has been notified via {sendMethod}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">Delivery Channel</Label>
                          <Select value={sendMethod} onValueChange={(v) => setSendMethod(v as "email" | "sms" | "both")}>
                            <SelectTrigger className="border-amber-200 focus:ring-green-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email" disabled={!selectedFarmer?.email}>
                                <span className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5" /> Email
                                  {!selectedFarmer?.email && <span className="text-red-400 text-xs">(none on file)</span>}
                                </span>
                              </SelectItem>
                              <SelectItem value="sms" disabled={!selectedFarmer?.phone_number}>
                                <span className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5" /> SMS
                                  {!selectedFarmer?.phone_number && <span className="text-red-400 text-xs">(none on file)</span>}
                                </span>
                              </SelectItem>
                              <SelectItem value="both" disabled={!selectedFarmer?.email && !selectedFarmer?.phone_number}>
                                <span className="flex items-center gap-2">
                                  <Send className="h-3.5 w-3.5" /> Email + SMS
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">Contact on File</Label>
                          <div className="p-2 rounded-md border border-amber-100 bg-amber-50 space-y-1">
                            {selectedFarmer?.email ? (
                              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                <Mail className="h-3 w-3 text-green-500" />{selectedFarmer.email}
                              </p>
                            ) : (
                              <p className="text-xs text-red-400 flex items-center gap-1.5">
                                <Mail className="h-3 w-3" /> No email
                              </p>
                            )}
                            {selectedFarmer?.phone_number ? (
                              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-green-500" />{selectedFarmer.phone_number}
                              </p>
                            ) : (
                              <p className="text-xs text-red-400 flex items-center gap-1.5">
                                <Phone className="h-3 w-3" /> No phone
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                          Personal Note <span className="font-normal text-gray-400">(Optional)</span>
                        </Label>
                        <Textarea
                          placeholder="Add a short personal message to the farmer..."
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          rows={2}
                          maxLength={500}
                          className="border-amber-200 focus-visible:ring-green-500 text-sm resize-none"
                        />
                        <p className="text-xs text-gray-400 text-right">{customMessage.length}/500</p>
                      </div>

                      {sendError && (
                        <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {sendError}
                        </div>
                      )}

                      <Button
                        onClick={handleSendResults}
                        disabled={isSending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                      >
                        {isSending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                        ) : (
                          <><Send className="mr-2 h-4 w-4" />
                            Send Results via {sendMethod === "both" ? "Email & SMS" : sendMethod.toUpperCase()}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            // Empty state — same style as the farmer's page
            <Card className="border-amber-200 bg-white shadow-lg h-full">
              <CardContent className="p-6 h-full flex flex-col justify-center">
                <div className="text-center space-y-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-full w-fit mx-auto">
                    <Leaf className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-gray-900">
                      {selectedFarmer ? "Ready for Analysis" : "Select a Farmer First"}
                    </h3>
                    <p className="text-gray-500 mt-1">
                      {selectedFarmer
                        ? "Fill in the soil details on the left to get started"
                        : "Use the search above to find and select a farmer"}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    {
                      step: "01",
                      icon: <User className="h-5 w-5 text-purple-600" />,
                      iconBg: "bg-purple-100",
                      title: "Select Farmer",
                      desc: "Search for the farmer you are visiting and select their account.",
                    },
                    {
                      step: "02",
                      icon: <FlaskConical className="h-5 w-5 text-blue-600" />,
                      iconBg: "bg-blue-100",
                      title: "Enter pH & Location",
                      desc: "Detect the field location and provide the soil pH. Add nutrient values if you have lab results.",
                    },
                    {
                      step: "03",
                      icon: <Sprout className="h-5 w-5 text-amber-600" />,
                      iconBg: "bg-amber-100",
                      title: "Send Results",
                      desc: "After analysis, send the report directly to the farmer via email or SMS.",
                    },
                  ].map(({ step, icon, iconBg, title, desc }) => (
                    <div
                      key={step}
                      className="flex flex-col items-center text-center p-4 rounded-xl border border-amber-100 bg-gradient-to-b from-green-50/50 to-white space-y-3"
                    >
                      <div className="relative">
                        <div className={`p-3 ${iconBg} rounded-xl`}>{icon}</div>
                        <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white bg-green-600 rounded-full w-5 h-5 flex items-center justify-center">
                          {step}
                        </span>
                      </div>
                      <h4 className="font-semibold font-serif text-green-900 text-sm">{title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
