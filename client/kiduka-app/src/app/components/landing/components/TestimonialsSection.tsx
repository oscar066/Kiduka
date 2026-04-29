import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Dr. John Kamau",
    role: "Agriculture Research Officer",
    initials: "JK",
    avatarBg: "bg-green-700",
    content:
      "Kiduka's triple-mode architecture is a game-changer. The way it prioritizes lab data while using ML for gap-filling provides a level of precision I haven't seen in other platforms.",
    rating: 5,
  },
  {
    name: "David Omondi",
    role: "Commercial Maize Farmer",
    initials: "DO",
    avatarBg: "bg-amber-600",
    content:
      "The localized Agrovet recommendations saved me days of searching. It pointed me exactly to where I could find the DAP and CAN for my specific soil needs.",
    rating: 5,
  },
  {
    name: "Sarah Wanjiru",
    role: "Precision Agronomist",
    initials: "SW",
    avatarBg: "bg-emerald-700",
    content:
      "The integration with Google Earth Engine for NDVI and SAR data provides a highly accurate environmental signature. It's sophisticated yet remarkably easy for my clients to use.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            Testimonials
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 mb-4">
            Trusted by Farmers &amp; Agronomists
          </h3>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            Hear from the people using Kiduka to transform their farming decisions
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative bg-gray-50 rounded-3xl p-8 flex flex-col gap-5 border border-amber-200 hover:border-amber-300 hover:shadow-xl transition-all duration-300 group"
            >
              <span className="absolute top-6 right-8 text-6xl font-serif text-amber-100 group-hover:text-amber-200 transition-colors leading-none select-none">
                &ldquo;
              </span>

              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-gray-600 leading-relaxed text-sm flex-1">{t.content}</p>

              <div className="flex items-center gap-3 pt-4 border-t border-amber-100">
                <div className={`w-10 h-10 rounded-full ${t.avatarBg} text-white text-sm font-bold font-serif flex items-center justify-center flex-shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-green-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
