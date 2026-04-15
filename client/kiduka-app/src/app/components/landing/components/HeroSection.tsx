import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

export function HeroSection() {
  return (
    <section id="home" className="relative overflow-hidden pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-green-900 leading-[1.1]">
              Precision Agriculture
              <br />
              <span className="text-green-600">Driven by Data</span>
            </h2>
            <p className="text-xl sm:text-2xl text-gray-600 font-serif max-w-3xl mx-auto leading-relaxed">
              Kiduka is a sophisticated decision-support system that bridges the gap between satellite environmental data and actionable farming practices.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Login to Portal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-green-600 text-green-700 hover:bg-green-50 px-8 py-6 text-lg font-semibold"
              >
                Create Account
              </Button>
            </Link>
          </div>

          <div className="pt-8 flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">Trusted by farmers and agronomists worldwide</p>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
    </section>
  );
}
