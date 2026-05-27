"use client";

import { useState } from "react";
import {
  MapPin,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Navigation,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getReverseGeocode } from "@/lib/location-utils";

interface LocationDetectorProps {
  onLocationDetected: (lat: number, lng: number, name?: string) => void;
}

export function LocationDetector({ onLocationDetected }: LocationDetectorProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "manual">("idle");
  const [error, setError] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [isResolvingName, setIsResolvingName] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const resolveLocationName = async (lat: number, lng: number) => {
    setIsResolvingName(true);
    const name = await getReverseGeocode(lat, lng);
    setIsResolvingName(false);
    return name;
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported by this browser");
      return;
    }

    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isSecure) {
      setStatus("error");
      setError("Geolocation requires a secure connection (HTTPS)");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setStatus("success");
        setLocation({ lat, lng });
        const name = await resolveLocationName(lat, lng);
        const locationName = name || undefined;
        setLocation({ lat, lng, name: locationName });
        onLocationDetected(lat, lng, locationName);
      },
      (err) => {
        setStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location access denied. Please enable location access in your browser settings and try again.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information is unavailable. Please check your GPS settings.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out. Please try again.");
            break;
          default:
            setError("An unknown error occurred while detecting location.");
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
    );
  };

  const handleManualSubmit = async () => {
    const latNum = parseFloat(manualLat);
    const lngNum = parseFloat(manualLng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setError("Invalid coordinates — please enter valid numbers.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setLocation({ lat: latNum, lng: lngNum });

    const name = await resolveLocationName(latNum, lngNum);
    const locationName = name || undefined;

    setStatus("success");
    setLocation({ lat: latNum, lng: lngNum, name: locationName });
    onLocationDetected(latNum, lngNum, locationName);
    setManualLat("");
    setManualLng("");
  };

  const resetToIdle = () => {
    setStatus("idle");
    setLocation(null);
    setError("");
    setManualLat("");
    setManualLng("");
  };

  // ── Success ──────────────────────────────────────────────────────────────
  if (status === "success" && location) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 to-green-100/20" />
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-emerald-900 truncate">
                    {location.name || (isResolvingName ? "Resolving address…" : "Location Detected")}
                  </h3>
                  {!isResolvingName && (
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </div>
                <p className="text-xs text-emerald-600 font-medium">
                  {location.name ? (
                    <span className="font-mono text-[10px] opacity-70">
                      {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                    </span>
                  ) : (
                    "Coordinates identified"
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToIdle}
              className="border-emerald-300 text-emerald-700 hover:bg-white hover:border-emerald-400 ml-4 shrink-0"
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              Change
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-red-100/20 to-rose-100/20" />
        <div className="relative p-4 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 shadow-sm shrink-0">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Location Error</h3>
              <p className="text-sm text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              size="sm"
              onClick={detectLocation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Navigation className="h-4 w-4 mr-1.5" />
              Retry Auto-Detect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus("manual")}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              Enter Manually
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-indigo-100/20" />
        <div className="relative p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Detecting Location</h3>
                <p className="text-sm text-blue-700">Please allow location access when prompted</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStatus("idle"); setError(""); }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>
          {/* Indeterminate progress bar */}
          <div className="h-1.5 w-full rounded-full bg-blue-200 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Manual entry ──────────────────────────────────────────────────────────
  if (status === "manual") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 to-yellow-100/20" />
        <div className="relative p-4 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 shadow-sm">
              <Edit3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Enter Coordinates</h3>
              <p className="text-sm text-amber-700">Type in your latitude and longitude</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-800">Latitude</Label>
              <Input
                placeholder="-1.2921"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="border-amber-200 focus-visible:ring-amber-400 focus-visible:border-amber-400 h-10 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-800">Longitude</Label>
              <Input
                placeholder="36.8219"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="border-amber-200 focus-visible:ring-amber-400 focus-visible:border-amber-400 h-10 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleManualSubmit}
              disabled={!manualLat || !manualLng}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Confirm Location
            </Button>
            <Button
              variant="outline"
              onClick={() => { setStatus("idle"); setManualLat(""); setManualLng(""); }}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Idle (default) ────────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 to-yellow-100/20" />
      <div className="relative p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 shadow-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Location Required</h3>
              <p className="text-sm text-amber-700">We need your location for accurate soil analysis</p>
            </div>
          </div>
          <div className="flex gap-3 ml-4 shrink-0">
            <Button
              onClick={detectLocation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Detect Location
            </Button>
            <Button
              variant="outline"
              onClick={() => setStatus("manual")}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Enter Manually
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
