"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Leaf, 
  CheckCircle, 
  ArrowRight, 
  Sprout, 
  TestTube, 
  TrendingUp,
  Menu,
  X,
  Star,
  Quote,
  ChevronDown
} from "lucide-react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Handle scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);



  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsMenuOpen(false);
    }
  };



  const testimonials = [
    {
      name: "John Kamau",
      role: "Maize Farmer, Nakuru",
      content: "Kiduka has transformed my farming! The soil analysis helped me increase my yield by 40% in just one season.",
      rating: 5,
    },
    {
      name: "David Omondi",
      role: "Agronomist, Kisumu",
      content: "The fertilizer recommendations are spot-on. I now advise all my clients to use Kiduka for soil testing.",
      rating: 5,
    },
    {
      name: "Sarah Wanjiru",
      role: "Vegetable Farmer, Kiambu",
      content: "Easy to use and very accurate. The reports are detailed and help me make better farming decisions.",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How accurate is the soil analysis?",
      answer: "Our AI-powered analysis uses advanced machine learning algorithms trained on thousands of soil samples. The accuracy rate is over 95% for nutrient assessment and soil fertility predictions.",
    },
    {
      question: "How do I collect soil samples?",
      answer: "You can collect soil samples from different parts of your farm at a depth of 6-8 inches. Mix them together and take a representative sample for testing. Detailed instructions are provided in your dashboard.",
    },
    {
      question: "What information do I need to provide?",
      answer: "You'll need to input basic soil properties like pH, nitrogen (N), phosphorus (P), potassium (K), and other macro and micro nutrients. Our system guides you through the entire process.",
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes! New users get 3 free soil analyses to try out the platform. After that, you can choose from our flexible pricing plans based on your needs.",
    },
    {
      question: "Can I track multiple farms?",
      answer: "Absolutely! Our platform allows you to manage multiple farm locations and track soil health separately for each plot or field.",
    },
    {
      question: "How quickly do I get results?",
      answer: "Results are instant! Once you input your soil data, our AI analyzes it immediately and provides comprehensive reports and recommendations within seconds.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50" suppressHydrationWarning>
      {/* Sticky Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-md" : "bg-white/80 backdrop-blur-sm"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => scrollToSection("home")}>
              <div className="p-2 bg-green-600 rounded-lg">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-serif font-bold text-green-800">Kiduka Labs</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection("home")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Home
              </button>
              <button onClick={() => scrollToSection("features")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection("how-it-works")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                How It Works
              </button>
              <button onClick={() => scrollToSection("testimonials")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Testimonials
              </button>
              <button onClick={() => scrollToSection("faq")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                FAQ
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-green-700 hover:text-green-800">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Sign Up
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-2 space-y-2">
              <button onClick={() => scrollToSection("home")} className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg">
                Home
              </button>
              <button onClick={() => scrollToSection("features")} className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg">
                Features
              </button>
              <button onClick={() => scrollToSection("how-it-works")} className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg">
                How It Works
              </button>
              <button onClick={() => scrollToSection("testimonials")} className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg">
                Testimonials
              </button>
              <button onClick={() => scrollToSection("faq")} className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg">
                FAQ
              </button>
              <div className="pt-4 space-y-2">
                <Link href="/auth/login" className="block">
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link href="/auth/signup" className="block">
                  <Button className="w-full bg-green-600 hover:bg-green-700">Sign Up</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-green-900 leading-tight">
                Smart Soil Analysis
                <br />
                <span className="text-green-600">Made Simple</span>
              </h2>
              <p className="text-xl sm:text-2xl text-gray-600 font-serif max-w-3xl mx-auto">
                Harness the power of AI to analyze your soil, get personalized fertilizer recommendations, and optimize your agricultural yields.
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



      {/* Features Section */}
      <section id="features" className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-green-800 mb-4">
              Why Choose Kiduka?
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with agricultural expertise to deliver accurate, actionable insights.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-amber-200 hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="inline-flex p-4 bg-green-100 rounded-2xl">
                  <TestTube className="h-10 w-10 text-green-600" />
                </div>
                <h4 className="text-xl font-serif font-bold text-green-800">
                  AI-Powered Analysis
                </h4>
                <p className="text-gray-600">
                  Advanced machine learning algorithms analyze your soil composition and provide precise nutrient assessments.
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="inline-flex p-4 bg-amber-100 rounded-2xl">
                  <Sprout className="h-10 w-10 text-amber-600" />
                </div>
                <h4 className="text-xl font-serif font-bold text-green-800">
                  Personalized Recommendations
                </h4>
                <p className="text-gray-600">
                  Get tailored fertilizer recommendations based on your soil type, crop needs, and local conditions.
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="inline-flex p-4 bg-blue-100 rounded-2xl">
                  <TrendingUp className="h-10 w-10 text-blue-600" />
                </div>
                <h4 className="text-xl font-serif font-bold text-green-800">
                  Track Your Progress
                </h4>
                <p className="text-gray-600">
                  Monitor soil health over time with comprehensive reports and historical data visualization.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-green-800 mb-4">
              How It Works
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started with soil analysis in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full text-2xl font-bold font-serif">
                1
              </div>
              <h4 className="text-xl font-serif font-bold text-green-800">
                Input Soil Data
              </h4>
              <p className="text-gray-600">
                Enter your soil composition details including pH, nitrogen, phosphorus, potassium, and other key nutrients.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-600 text-white rounded-full text-2xl font-bold font-serif">
                2
              </div>
              <h4 className="text-xl font-serif font-bold text-green-800">
                AI Analysis
              </h4>
              <p className="text-gray-600">
                Our advanced algorithms analyze your data and assess soil fertility, texture, and nutrient balance.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-2xl font-bold font-serif">
                3
              </div>
              <h4 className="text-xl font-serif font-bold text-green-800">
                Get Recommendations
              </h4>
              <p className="text-gray-600">
                Receive personalized fertilizer recommendations and actionable insights to improve your soil health.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-green-800 mb-4">
              What Our Users Say
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied farmers and agronomists who trust Kiduka
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-amber-200 hover:shadow-xl transition-shadow">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center justify-center">
                    <Quote className="h-12 w-12 text-green-200" />
                  </div>
                  <div className="flex justify-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic text-center">
                    "{testimonial.content}"
                  </p>
                  <div className="text-center pt-4 border-t border-gray-100">
                    <p className="font-semibold text-green-800">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-serif font-bold text-green-800 mb-4">
              Frequently Asked Questions
            </h3>
            <p className="text-lg text-gray-600">
              Everything you need to know about Kiduka
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="border-amber-200 overflow-hidden">
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h4 className="text-lg font-semibold text-green-800 text-left">{faq.question}</h4>
                  <ChevronDown
                    className={`h-5 w-5 text-green-600 transition-transform ${
                      openFAQ === index ? "transform rotate-180" : ""
                    }`}
                  />
                </button>
                {openFAQ === index && (
                  <div className="px-6 py-4 bg-green-50/50 border-t border-amber-100">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
                className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-green-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Leaf className="h-6 w-6 text-green-400" />
                <span className="text-xl font-serif font-bold text-white">Kiduka Labs</span>
              </div>
              <p className="text-green-200 text-sm">
                Empowering agriculture through intelligent soil analysis and data-driven insights.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="text-white font-semibold">Quick Links</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("testimonials")} className="hover:text-white transition-colors">
                    Testimonials
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("faq")} className="hover:text-white transition-colors">
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="text-white font-semibold">Contact</h5>
              <p className="text-green-200 text-sm">
                Have questions? Reach out to our team for support and guidance.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-green-800 text-center text-sm text-green-300">
            <p>&copy; {new Date().getFullYear()} Kiduka Labs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
