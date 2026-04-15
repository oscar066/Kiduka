import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Zap, Beaker } from "lucide-react";

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24 bg-white/50 backdrop-blur-sm relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h3 className="text-3xl sm:text-5xl font-serif font-bold text-green-800 mb-6">
            Triple Prediction Architecture
          </h3>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-serif">
            Kiduka intelligently routes analysis through three dynamic modes based on your available data precision.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          <Card className="border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-10 space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                <Cpu className="h-8 w-8 text-green-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-serif font-bold text-green-900">ML Predictive Engine</h4>
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 px-3 py-1">Rapid Satellite Analysis</Badge>
              </div>
              <p className="text-gray-600 leading-relaxed font-serif">
                Leverages Google Earth Engine and high-resolution satellite imagery (NDVI, SAR, SRTM) to estimate nutrients when lab results are unavailable.
              </p>
              <div className="pt-4 border-t border-amber-100">
                <p className="text-sm font-medium text-green-700 font-serif">Ideal for: Quick environmental assessments</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-10 space-y-6">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 transition-colors duration-300">
                <Zap className="h-8 w-8 text-amber-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-serif font-bold text-green-900">Hybrid Analysis</h4>
                <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 px-3 py-1">ML-Enhanced Lab Data</Badge>
              </div>
              <p className="text-gray-600 leading-relaxed font-serif">
                Fills data gaps by merging lab measurements with ML estimations. Real measurements always override predictions for maximum accuracy.
              </p>
              <div className="pt-4 border-t border-amber-100">
                <p className="text-sm font-medium text-amber-700 font-serif">Ideal for: Partial lab results</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-10 space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <Beaker className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-serif font-bold text-green-900">Diagnostic Engine</h4>
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 px-3 py-1">High-Precision Formulaic</Badge>
              </div>
              <p className="text-gray-600 leading-relaxed font-serif">
                A high-precision rule-based model using scientific weighting and expert system filters for precise nutrient recommendations.
              </p>
              <div className="pt-4 border-t border-amber-100">
                <p className="text-sm font-medium text-blue-700 font-serif">Ideal for: Full laboratory samples</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
