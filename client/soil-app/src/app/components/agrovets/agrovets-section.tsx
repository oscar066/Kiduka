"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgrovetCard } from "./agrovet-card";
import { Store, MapPin, Package } from "lucide-react";

interface Agrovet {
  name: string;
  latitude: number;
  longitude: number;
  products: string[];
  prices: number[];
  distance_km: number;
}

interface AgrovetsSection {
  agrovets: Agrovet[];
  recommendedFertilizer: string;
}

export function AgrovetsSection({
  agrovets,
  recommendedFertilizer,
}: AgrovetsSection) {
  const agrovetsWithRecommended = agrovets.filter((agrovet) =>
    agrovet.products.includes(recommendedFertilizer)
  );
  const otherAgrovets = agrovets.filter(
    (agrovet) => !agrovet.products.includes(recommendedFertilizer)
  );

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Store className="h-5 w-5" />
          Nearby Agrovets
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-green-600">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{agrovets.length} locations found</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>
              {agrovetsWithRecommended.length} have {recommendedFertilizer}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {agrovetsWithRecommended.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white">
                Recommended Fertilizer Available
              </Badge>
              <span className="text-sm text-gray-600">
                {agrovetsWithRecommended.length} location(s) have{" "}
                {recommendedFertilizer}
              </span>
            </div>
            <div className="grid gap-4">
              {agrovetsWithRecommended.map((agrovet, index) => (
                <AgrovetCard
                  key={index}
                  agrovet={agrovet}
                  recommendedFertilizer={recommendedFertilizer}
                />
              ))}
            </div>
          </div>
        )}

        {otherAgrovets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Other Agrovets</Badge>
              <span className="text-sm text-gray-600">
                {otherAgrovets.length} additional location(s)
              </span>
            </div>
            <div className="grid gap-4">
              {otherAgrovets.map((agrovet, index) => (
                <AgrovetCard
                  key={index}
                  agrovet={agrovet}
                  recommendedFertilizer={recommendedFertilizer}
                />
              ))}
            </div>
          </div>
        )}

        {agrovets.length === 0 && (
          <div className="text-center py-8">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Agrovets Found
            </h3>
            <p className="text-gray-500">
              No agrovets found in your area. Try expanding your search radius.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
