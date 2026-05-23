"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { AgrovetInfo } from "@/types/soil-analysis";

interface AgrovetsDisplayProps {
  agrovets: AgrovetInfo[];
  title?: string;
}

export function AgrovetsDisplay({
  agrovets,
  title = "Nearby Agrovets",
}: AgrovetsDisplayProps) {
  if (!agrovets || agrovets.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <MapPin className="h-5 w-5" />
          {title} ({agrovets.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agrovets.map((agrovet, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-green-50 to-amber-50 p-4 rounded-lg border border-green-200"
            >
              <div className="mb-3">
                <h5 className="font-semibold text-green-800 mb-1">
                  {agrovet.name.trim()}
                </h5>
                <p className="text-sm text-gray-600">
                  {agrovet.distance_km.toFixed(1)} km away
                </p>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium text-green-700">
                    Available Products:
                  </Label>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {agrovet.products.map((product, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1.5 bg-green-50 rounded-lg border border-green-100"
                      >
                        <span className="text-xs font-medium text-green-800">
                          {product}
                        </span>
                        {agrovet.prices && agrovet.prices[idx] !== undefined && (
                          <span className="text-xs font-semibold text-amber-700">
                            KES {agrovet.prices[idx].toFixed(0)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {agrovet.rating && (
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-medium text-green-700">
                      Rating:
                    </Label>
                    <span className="text-sm text-yellow-600">
                      {"★".repeat(Math.floor(agrovet.rating))}
                      {agrovet.rating % 1 !== 0 && "☆"}
                      <span className="ml-1 text-gray-600">
                        ({agrovet.rating.toFixed(1)})
                      </span>
                    </span>
                  </div>
                )}

                {agrovet.phone && (
                  <div>
                    <Label className="text-xs font-medium text-green-700">
                      Phone:
                    </Label>
                    <a
                      href={`tel:${agrovet.phone}`}
                      className="text-sm text-green-700 hover:text-green-900 hover:underline font-medium transition-colors"
                    >
                      {agrovet.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
