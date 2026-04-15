import { Badge } from "@/components/ui/badge";
import { Map, Search } from "lucide-react";

export function AgrovetsSection() {
  return (
    <section id="agrovets" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative rounded-3xl overflow-hidden shadow-2xl">
            <img 
              src="/images/agrovet_store.png" 
              alt="Agrovet Solutions" 
              className="w-full h-[500px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-900/40 to-transparent"></div>
          </div>

          <div className="order-1 lg:order-2 space-y-8 text-left">
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-4 py-1 text-sm font-bold">GEOSPATIAL INTELLIGENCE</Badge>
            <h3 className="text-4xl sm:text-5xl font-serif font-bold text-green-900 leading-tight">
              Closing the Loop with <br />
              <span className="text-green-600">Localized Input Access</span>
            </h3>
            <p className="text-xl text-gray-600 font-serif leading-relaxed">
              Kiduka doesn&apos;t just diagnose it streamlines procurement. Our mapping engine uses the Haversine formula to connect you with the exact nutrients your soil needs.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="mt-1 flex-shrink-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                  <Map className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h5 className="font-bold text-green-900 font-serif text-lg">Proximity Ranking</h5>
                  <p className="text-gray-600 font-serif">Spherical distance calculation (Haversine) identifies the 5 nearest Agrovets within a 100km radius.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 flex-shrink-0 w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                  <Search className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h5 className="font-bold text-green-900 font-serif text-lg">Nutrient-Based Matching</h5>
                  <p className="text-gray-600 font-serif">Dynamically aligns predicted deficiencies with specific products like CAN, DAP, or Organic Manure.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
