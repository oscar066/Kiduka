"use client";

import { useState } from "react";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LocationDetectorProps {
  onLocationDetected: (lat: number, lng: number) => void;
}

export function LocationDetector({
  onLocationDetected,
}: LocationDetectorProps) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const detectLocation = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported by this browser");
      return;
    }

    // Check if we're on HTTPS or localhost
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
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setStatus("success");
        onLocationDetected(lat, lng);
      },
      (error) => {
        setStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError(
              "Location access denied. Please enable location access in your browser settings and try again."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setError(
              "Location information is unavailable. Please check your GPS settings."
            );
            break;
          case error.TIMEOUT:
            setError("Location request timed out. Please try again.");
            break;
          default:
            setError("An unknown error occurred while detecting location.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Manual location input fallback
  const handleManualLocation = () => {
    const lat = prompt("Enter your latitude:");
    const lng = prompt("Enter your longitude:");

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setLocation({ lat: latNum, lng: lngNum });
        setStatus("success");
        onLocationDetected(latNum, lngNum);
      } else {
        setStatus("error");
        setError("Invalid coordinates entered");
      }
    }
  };

  if (status === "success" && location) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setStatus("idle");
              setLocation(null);
            }}
            className="text-green-600 border-green-200"
          >
            Change
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={detectLocation}
              className="text-red-600 border-red-200"
            >
              Retry Auto-Detect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualLocation}
              className="text-blue-600 border-blue-200"
            >
              Enter Manually
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "loading") {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700">
              Detecting your location...
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus("idle")}
            className="text-gray-600 border-gray-200"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Initial state - show button to trigger location detection
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Location required for soil analysis
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={detectLocation}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Detect Location
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualLocation}
            className="text-blue-600 border-blue-200"
          >
            Enter Manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
