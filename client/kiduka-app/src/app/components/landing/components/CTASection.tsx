import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-800">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-700" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-green-700/60 border border-green-600/50 text-green-300 text-sm font-semibold px-4 py-1.5 rounded-full">
          <Leaf className="h-3.5 w-3.5" />
          Start for free today
        </div>

        <h3 className="text-3xl sm:text-4xl font-serif font-bold text-white leading-tight">
          Ready to Transform Your
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-amber-300">
            Agricultural Practice?
          </span>
        </h3>

        <p className="text-base text-green-100/80 max-w-2xl mx-auto">
          Join thousands of farmers and agronomists across Kenya who rely on
          Kiduka for precision soil insights and smarter input decisions.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
          <Link href="/auth/signup">
            <Button
              size="lg"
              className="bg-green-400 hover:bg-green-300 text-green-950 font-bold px-8 py-6 text-lg shadow-lg transition-all hover:-translate-y-0.5"
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

        <p className="text-green-500 text-sm">
          No credit card required · Full access · Trusted by agronomists
        </p>
      </div>
    </section>
  );
}
