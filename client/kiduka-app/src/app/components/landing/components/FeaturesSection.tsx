import { Globe, Layers, Zap, Database, Cpu } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl sm:text-5xl font-serif font-bold text-green-800 mb-6">
            Data-Driven Agricultural Intelligence
          </h3>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-serif">
            Our platform harmonizes localized lab data with global satellite imagery through a sophisticated triple-mode architecture.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
            <h3 className="text-4xl sm:text-5xl font-serif font-bold leading-tight text-left">
              Advanced Environmental <br />
              <span className="text-green-400">Intelligence Engine</span>
            </h3>
            <p className="text-xl text-gray-600 font-serif leading-relaxed text-left">
              Kiduka fetches and processes high-resolution satellite data from the Google Earth Engine to understand your farm&apos;s unique environmental signature.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-50 rounded-lg"><Globe className="h-5 w-5 text-green-600" /></div>
                <div className="text-left">
                  <h5 className="font-bold font-serif text-green-900">Vegetation Trends</h5>
                  <p className="text-sm text-gray-600">NDVI imagery assesses historical plant health patterns.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-50 rounded-lg"><Layers className="h-5 w-5 text-green-600" /></div>
                <div className="text-left">
                  <h5 className="font-bold font-serif text-green-900">Soil Texture</h5>
                  <p className="text-sm text-gray-600">Sand-to-clay ratios via global OpenLandMap data.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-50 rounded-lg"><Zap className="h-5 w-5 text-green-600" /></div>
                <div className="text-left">
                  <h5 className="font-bold font-serif text-green-900">SAR Data</h5>
                  <p className="text-sm text-gray-600">Sentinel-1 Synthetic Aperture Radar for moisture profiles.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-50 rounded-lg"><Database className="h-5 w-5 text-green-600" /></div>
                <div className="text-left">
                  <h5 className="font-bold font-serif text-green-900">Climate Patterns</h5>
                  <p className="text-sm text-gray-600 font-serif">CHIRPS historical rainfall and terrain elevation profiles.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-700">
            <img 
              src="/images/precision_ag_intelligence.png" 
              alt="Precision Agriculture Intelligence" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-950/20 to-transparent flex flex-col justify-end p-8 text-left">
              <div className="inline-flex items-center gap-2 bg-green-600 px-4 py-1 rounded-full text-xs font-bold mb-4 w-fit text-white">
                <Cpu className="h-3 w-3" /> NEURAL NETWORK MODELS
              </div>
              <p className="text-lg font-serif italic text-white/90">
                &quot;Turning complex geospatial data into field-level macronutrient estimations.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
