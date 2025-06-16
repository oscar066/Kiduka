"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, DollarSign, Navigation } from "lucide-react";

interface Agrovet {
  name: string;
  latitude: number;
  longitude: number;
  products: string[];
  prices: number[];
  distance_km: number;
}

interface AgrovetCardProps {
  agrovet: Agrovet;
  recommendedFertilizer: string;
}

export function AgrovetCard({
  agrovet,
  recommendedFertilizer,
}: AgrovetCardProps) {
  const hasRecommendedProduct = agrovet.products.includes(
    recommendedFertilizer
  );
  const recommendedProductIndex = agrovet.products.indexOf(
    recommendedFertilizer
  );
  const recommendedPrice =
    recommendedProductIndex !== -1
      ? agrovet.prices[recommendedProductIndex]
      : null;

  return (
    <Card
      className={`border-2 ${
        hasRecommendedProduct
          ? "border-green-300 bg-green-50"
          : "border-amber-200 bg-white"
      } shadow-sm hover:shadow-md transition-shadow`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-gray-900 leading-tight">
            {agrovet.name.trim()}
          </CardTitle>
          {hasRecommendedProduct && (
            <Badge className="bg-green-600 text-white">
              Has {recommendedFertilizer}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Navigation className="h-4 w-4" />
          <span>{agrovet.distance_km.toFixed(1)} km away</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>
            {agrovet.latitude.toFixed(4)}, {agrovet.longitude.toFixed(4)}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Available Products:
            </span>
          </div>

          <div className="space-y-2">
            {agrovet.products.map((product, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  product === recommendedFertilizer
                    ? "bg-green-100 border border-green-200"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      product === recommendedFertilizer
                        ? "default"
                        : "secondary"
                    }
                    className={
                      product === recommendedFertilizer ? "bg-green-600" : ""
                    }
                  >
                    {product}
                  </Badge>
                  {product === recommendedFertilizer && (
                    <span className="text-xs text-green-700 font-medium">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-500" />
                  <span className="text-sm font-medium">
                    ${agrovet.prices[index].toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasRecommendedProduct && recommendedPrice && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">
                  {recommendedFertilizer} Price:
                </span>
                <span className="text-lg font-bold text-green-700">
                  ${recommendedPrice.toFixed(0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
