import { Globe, Layers, Zap, Database } from "lucide-react";

const features = [
  {
    icon: Globe,
    iconBg: "from-green-100 to-emerald-100",
    iconColor: "text-green-600",
    title: "Vegetation Trends",
    description: "NDVI imagery assesses historical plant health patterns.",
  },
  {
    icon: Layers,
    iconBg: "from-amber-100 to-yellow-100",
    iconColor: "text-amber-600",
    title: "Soil Texture",
    description: "Sand-to-clay ratios via global OpenLandMap data.",
  },
  {
    icon: Zap,
    iconBg: "from-blue-100 to-cyan-100",
    iconColor: "text-blue-600",
    title: "SAR Data",
    description: "Sentinel-1 Synthetic Aperture Radar for moisture profiles.",
  },
  {
    icon: Database,
    iconBg: "from-emerald-100 to-teal-100",
    iconColor: "text-emerald-600",
    title: "Climate Patterns",
    description: "CHIRPS historical rainfall and terrain elevation profiles.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            Intelligence Engine
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 mb-6">
            Data-Driven Agricultural Intelligence
          </h3>
          <p className="text-base text-gray-500 max-w-3xl mx-auto font-serif">
            Our platform harmonizes localized lab data with global satellite imagery through a sophisticated triple-mode architecture.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 leading-tight">
                Advanced Environmental
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-amber-500">
                  Intelligence Engine
                </span>
              </h3>
              <p className="text-base text-gray-500 font-serif leading-relaxed">
                Kiduka fetches and processes high-resolution satellite data from the Google Earth Engine to understand your farm&apos;s unique environmental signature.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex items-start gap-4 bg-white rounded-2xl border border-amber-200 hover:border-amber-300 hover:shadow-md p-5 transition-all duration-200"
                  >
                    <div className={`flex-shrink-0 p-2.5 bg-gradient-to-br ${f.iconBg} rounded-xl`}>
                      <Icon className={`h-5 w-5 ${f.iconColor}`} />
                    </div>
                    <div>
                      <h5 className="font-bold font-serif text-green-900 text-sm">{f.title}</h5>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-amber-100">
            <img
              src="/images/precision_ag_intelligence.png"
              alt="Precision Agriculture Intelligence"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
