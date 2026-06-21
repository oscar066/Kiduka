"use client";

import { MapPin } from "lucide-react";
import { AgrovetInfo } from "@/types/soil-analysis";

interface AgrovetsDisplayProps {
  agrovets: AgrovetInfo[];
  title?: string;
  userLat?: number;
  userLng?: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function AgrovetsDisplay({ agrovets, title = "Nearby Agrovets", userLat, userLng }: AgrovetsDisplayProps) {
  if (!agrovets || agrovets.length === 0) return null;

  const getDistance = (agrovet: AgrovetInfo): number | null => {
    if (agrovet.distance_km && agrovet.distance_km > 0) return agrovet.distance_km;
    if (userLat && userLng && agrovet.latitude && agrovet.longitude) {
      return haversineKm(userLat, userLng, agrovet.latitude, agrovet.longitude);
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-600" />
          <span className="text-sm font-serif font-semibold text-green-800">{title}</span>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
            {agrovets.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">Fertilizer stockists near your location</p>
      </div>

      <div className="p-5">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agrovets.map((agrovet, index) => {
            const dist = getDistance(agrovet);
            return (
              <div
                key={index}
                className="rounded-lg border border-amber-100 bg-gradient-to-b from-green-50/50 to-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="mb-3">
                  <h5 className="font-semibold font-serif text-green-800 text-sm">{agrovet.name.trim()}</h5>
                  {dist !== null && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {dist.toFixed(1)} km away
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1">Available Products</p>
                    <div className="flex flex-col gap-1">
                      {agrovet.products.map((product, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-amber-100"
                        >
                          <span className="text-xs font-medium text-gray-700">{product}</span>
                          {agrovet.prices && agrovet.prices[idx] !== undefined && (
                            <span className="text-xs font-semibold text-amber-700 tabular-nums">
                              KES {agrovet.prices[idx].toFixed(0)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {agrovet.rating && (
                    <p className="text-xs text-gray-500">
                      <span className="text-yellow-500">{"★".repeat(Math.floor(agrovet.rating))}{agrovet.rating % 1 !== 0 && "☆"}</span>
                      <span className="ml-1 text-gray-400">({agrovet.rating.toFixed(1)})</span>
                    </p>
                  )}

                  {agrovet.phone && (
                    <a
                      href={`tel:${agrovet.phone}`}
                      className="text-xs text-green-700 hover:text-green-900 hover:underline font-medium transition-colors block"
                    >
                      {agrovet.phone}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
