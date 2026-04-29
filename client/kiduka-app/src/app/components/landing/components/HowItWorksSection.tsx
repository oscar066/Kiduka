import { MapPin, BrainCircuit, ShoppingBag } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MapPin,
    iconBg: "bg-gradient-to-br from-green-100 to-emerald-100",
    iconColor: "text-green-600",
    ringColor: "ring-green-200",
    cardBg: "bg-white border-amber-200 hover:border-green-300",
    stepLabel: "text-green-600",
    title: "Data Input",
    description:
      "Enter your GPS coordinates and soil pH for ML analysis, or include partial or full lab results to unlock higher-precision diagnostic modes.",
  },
  {
    number: "02",
    icon: BrainCircuit,
    iconBg: "bg-gradient-to-br from-amber-100 to-yellow-100",
    iconColor: "text-amber-600",
    ringColor: "ring-amber-200",
    cardBg: "bg-white border-amber-200 hover:border-amber-400",
    stepLabel: "text-amber-600",
    title: "Hybrid Core Analysis",
    description:
      "Our AI engine fuses satellite data from Google Earth Engine with your inputs to compute an accurate Soil Health Index, filling data gaps intelligently.",
  },
  {
    number: "03",
    icon: ShoppingBag,
    iconBg: "bg-gradient-to-br from-blue-100 to-cyan-100",
    iconColor: "text-blue-600",
    ringColor: "ring-blue-200",
    cardBg: "bg-white border-amber-200 hover:border-blue-300",
    stepLabel: "text-blue-600",
    title: "Precision Action",
    description:
      "Receive fertilizer recommendations tailored to your deficiencies, paired with a ranked list of the nearest Agrovets stocking exactly what you need.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            Simple Process
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 mb-4">
            How It Works
          </h3>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            From raw coordinates to actionable recommendations in three steps
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8 md:gap-6">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-[3.25rem] left-[calc(33.33%_-_1rem)] right-[calc(33.33%_-_1rem)] h-px bg-gradient-to-r from-green-200 via-amber-300 to-blue-200" />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative flex flex-col items-center text-center space-y-5">
                <div className={`relative z-10 w-14 h-14 ${step.iconBg} rounded-2xl flex items-center justify-center ring-4 ${step.ringColor} ring-offset-2`}>
                  <Icon className={`h-6 w-6 ${step.iconColor}`} />
                </div>

                <span className={`text-xs font-bold font-mono uppercase tracking-widest ${step.stepLabel}`}>
                  Step {step.number}
                </span>

                <div className={`w-full rounded-2xl border ${step.cardBg} p-6 shadow-sm hover:shadow-md transition-all duration-200`}>
                  <h4 className="text-base font-serif font-bold text-green-900 mb-3">{step.title}</h4>
                  <p className="text-gray-500 leading-relaxed text-sm">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
