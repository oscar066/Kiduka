import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, Satellite, FlaskConical } from "lucide-react";

const stats = [
  { value: "500+", label: "Active Farmers" },
  { value: "95%+", label: "SHI Accuracy" },
  { value: "47", label: "Counties Covered" },
  { value: "3", label: "Analysis Modes" },
];

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-800 pt-16"
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient glow blobs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-700" />
      <div className="absolute top-40 right-1/3 w-64 h-64 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 bg-green-800/60 border border-green-600/50 text-green-300 text-sm font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm">
            <Satellite className="h-3.5 w-3.5" />
            AI-Powered · Google Earth Engine · Kenya
          </span>
        </div>

        {/* Heading */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white leading-[1.1] tracking-tight">
            Precision Agriculture
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-emerald-300 to-amber-300">
              Driven by Data
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-green-100/80 font-serif max-w-3xl mx-auto leading-relaxed">
            Kiduka bridges satellite environmental intelligence with actionable
            farming decisions giving every Kenyan farmer access to lab-grade
            soil insights.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
          <Link href="/auth/signup">
            <Button
              size="lg"
              className="bg-green-400 hover:bg-green-300 text-green-950 font-bold px-8 py-6 text-lg shadow-lg shadow-green-900/40 transition-all hover:shadow-xl hover:shadow-green-700/30 hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-green-400/60 text-green-200 hover:bg-green-800/50 hover:text-white hover:border-green-300 px-8 py-6 text-lg bg-transparent transition-all"
            >
              Login to Portal
            </Button>
          </Link>
        </div>

        {/* Trust signal */}
        <p className="text-center text-green-400/70 text-sm mt-6 font-medium">
          Free to start · No credit card required · Trusted by agronomists
        </p>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-green-700/30 rounded-2xl overflow-hidden border border-green-700/30 backdrop-blur-sm">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-green-900/40 px-6 py-6 text-center"
            >
              <p className="text-3xl font-bold font-serif text-green-300">
                {stat.value}
              </p>
              <p className="text-sm text-green-400/80 mt-1 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {[
            { icon: Leaf, label: "Soil Health Index" },
            { icon: Satellite, label: "Satellite NDVI & SAR" },
            { icon: FlaskConical, label: "Lab Data Integration" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 text-green-300/80 text-sm border border-green-700/40 rounded-full px-4 py-1.5 bg-green-900/30"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/5 to-transparent" />
    </section>
  );
}
