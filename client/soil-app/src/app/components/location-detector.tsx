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
        timeout: 5000,
        maximumAge: 300000,
      }
    );
  };

  const handleManualLocation = () => {
    const lat = prompt("Enter your latitude:");
    const lng = prompt("Enter your longitude:");

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setLocation({ lat: latNum, lng: lngNum });
        setStatus("success");
        setError("");
        onLocationDetected(latNum, lngNum);
      } else {
        setStatus("error");
        setError("Invalid coordinates entered");
      }
    } else {
      if (lat === null || lng === null) {
        setStatus("idle");
        setError("");
      }
    }
  };

  // Success state with enhanced styling
  if (status === "success" && location) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 to-green-100/20"></div>
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-emerald-900">
                    Location Detected
                  </h3>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                <p className="text-sm text-emerald-700 font-mono">
                  {location.lat.toFixed(6)}°, {location.lng.toFixed(6)}°
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setStatus("idle");
                setLocation(null);
                setError("");
              }}
              className="flex items-center space-x-2 rounded-lg border border-emerald-300 bg-white/80 px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>Change</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state with improved messaging
  if (status === "error") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-red-100/20 to-rose-100/20"></div>
        <div className="relative p-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 shadow-sm">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Location Error</h3>
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={detectLocation}
                className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Navigation className="h-4 w-4" />
                <span>Retry Auto-Detect</span>
              </button>
              <button
                onClick={handleManualLocation}
                className="flex items-center space-x-2 rounded-lg border border-blue-300 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition-all duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Enter Manually</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state with animated elements
  if (status === "loading") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-indigo-100/20"></div>
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">
                  Detecting Location
                </h3>
                <p className="text-sm text-blue-700">
                  Please allow location access when prompted
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setStatus("idle");
                setError("");
              }}
              className="rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-blue-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial state with call-to-action design
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 to-orange-100/20"></div>
      <div className="relative p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 shadow-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">
                Location Required
              </h3>
              <p className="text-sm text-amber-700">
                We need your location for accurate soil analysis
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={detectLocation}
              className="flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transform hover:scale-105"
            >
              <Navigation className="h-4 w-4" />
              <span>Detect Location</span>
            </button>
            <button
              onClick={handleManualLocation}
              className="flex items-center space-x-2 rounded-lg border border-blue-300 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition-all duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>Enter Manually</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
