import { Map, Search, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Map,
    iconBg: "from-green-100 to-emerald-100",
    iconColor: "text-green-600",
    title: "Proximity Ranking",
    description:
      "Spherical distance calculation (Haversine) identifies the 5 nearest Agrovets within a 100km radius.",
  },
  {
    icon: Search,
    iconBg: "from-amber-100 to-yellow-100",
    iconColor: "text-amber-600",
    title: "Nutrient-Based Matching",
    description:
      "Dynamically aligns predicted deficiencies with specific products like CAN, DAP, or Organic Manure.",
  },
  {
    icon: ShieldCheck,
    iconBg: "from-blue-100 to-cyan-100",
    iconColor: "text-blue-600",
    title: "Verified Suppliers",
    description:
      "All Agrovets in our network are verified and geo-tagged for reliable, on-the-ground access.",
  },
];

export function AgrovetsSection() {
  return (
    <section id="agrovets" className="py-24 bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <div className="order-2 lg:order-1 relative rounded-3xl overflow-hidden shadow-2xl border border-amber-100">
            <img
              src="/images/agrovet_store.png"
              alt="Agrovet Solutions"
              className="w-full h-[480px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-950/30 to-transparent" />
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="space-y-4">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-600">
                Geospatial Intelligence
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 leading-tight">
                Closing the Loop with
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-amber-500">
                  Localized Input Access
                </span>
              </h3>
              <p className="text-base text-gray-500 font-serif leading-relaxed">
                Kiduka doesn&apos;t just diagnose — it streamlines procurement. Our mapping engine uses the Haversine formula to connect you with the exact nutrients your soil needs.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex gap-4 bg-white rounded-2xl border border-amber-200 hover:border-amber-300 hover:shadow-md p-5 transition-all duration-200"
                  >
                    <div className={`flex-shrink-0 w-11 h-11 bg-gradient-to-br ${f.iconBg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${f.iconColor}`} />
                    </div>
                    <div>
                      <h5 className="font-bold text-green-900 font-serif">{f.title}</h5>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
