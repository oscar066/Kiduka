import { Cpu, Zap, Beaker } from "lucide-react";

const modes = [
  {
    icon: Cpu,
    iconBg: "from-green-100 to-emerald-100",
    iconColor: "text-green-600",
    hoverIconBg: "group-hover:from-green-600 group-hover:to-emerald-600",
    hoverIconColor: "group-hover:text-white",
    badge: "Rapid Satellite Analysis",
    badgeStyle: "bg-green-50 text-green-700 border-green-200",
    title: "ML Predictive Engine",
    description:
      "Leverages Google Earth Engine and high-resolution satellite imagery (NDVI, SAR, SRTM) to estimate nutrients when lab results are unavailable.",
    idealFor: "Quick environmental assessments",
    idealColor: "text-green-700",
    cardBorder: "border-amber-200 hover:border-green-300",
  },
  {
    icon: Zap,
    iconBg: "from-amber-100 to-yellow-100",
    iconColor: "text-amber-600",
    hoverIconBg: "group-hover:from-amber-500 group-hover:to-yellow-500",
    hoverIconColor: "group-hover:text-white",
    badge: "ML-Enhanced Lab Data",
    badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
    title: "Hybrid Analysis",
    description:
      "Fills data gaps by merging lab measurements with ML estimations. Real measurements always override predictions for maximum accuracy.",
    idealFor: "Partial lab results",
    idealColor: "text-amber-700",
    cardBorder: "border-amber-200 hover:border-amber-400",
  },
  {
    icon: Beaker,
    iconBg: "from-blue-100 to-cyan-100",
    iconColor: "text-blue-600",
    hoverIconBg: "group-hover:from-blue-600 group-hover:to-cyan-600",
    hoverIconColor: "group-hover:text-white",
    badge: "High-Precision Formulaic",
    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
    title: "Diagnostic Engine",
    description:
      "A high-precision rule-based model using scientific weighting and expert system filters for precise nutrient recommendations.",
    idealFor: "Full laboratory samples",
    idealColor: "text-blue-700",
    cardBorder: "border-amber-200 hover:border-blue-300",
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-green-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse delay-1000 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            How We Analyze
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 mb-6">
            Triple Prediction Architecture
          </h3>
          <p className="text-base text-gray-500 max-w-3xl mx-auto font-serif">
            Kiduka intelligently routes your analysis through three dynamic modes based on your available data precision.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className={`group bg-white rounded-3xl border ${m.cardBorder} shadow-sm hover:shadow-xl transition-all duration-300 p-10 flex flex-col gap-6`}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${m.iconBg} ${m.hoverIconBg} rounded-2xl flex items-center justify-center transition-all duration-300`}>
                  <Icon className={`h-8 w-8 ${m.iconColor} ${m.hoverIconColor} transition-colors duration-300`} />
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg font-serif font-bold text-green-900">{m.title}</h4>
                  <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${m.badgeStyle}`}>
                    {m.badge}
                  </span>
                </div>

                <p className="text-gray-500 leading-relaxed font-serif text-sm flex-1">{m.description}</p>

                <div className="pt-4 border-t border-amber-100">
                  <p className={`text-sm font-semibold font-serif ${m.idealColor}`}>
                    Ideal for: {m.idealFor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
