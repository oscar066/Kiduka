import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-green-600 via-emerald-600 to-green-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <h3 className="text-3xl sm:text-4xl font-serif font-bold text-white">
          Ready to Transform Your Agriculture?
        </h3>
        <p className="text-xl text-green-100">
          Join thousands of farmers and agronomists who trust Kiduka for their soil analysis needs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth/signup">
            <Button 
              size="lg" 
              className="bg-white text-green-700 hover:bg-gray-100 px-8 py-6 text-lg font-semibold shadow-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 hover:text-white px-8 py-6 text-lg font-semibold"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
