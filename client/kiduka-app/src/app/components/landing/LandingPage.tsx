"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  ArrowRight, 
  Menu,
  X,
  Star,
  Quote,
  ChevronDown,
  Cpu,
  Database,
  Globe,
  Map,
  Beaker,
  Layers,
  Zap,
  Search
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
      name: "Dr. John Kamau",
      role: "Agriculture Research Officer",
      content: "Kiduka's triple-mode architecture is a game-changer. The way it prioritizes lab data while using ML for gap-filling provides a level of precision I haven't seen in other platforms.",
      rating: 5,
    },
    {
      name: "David Omondi",
      role: "Commercial Maize Farmer",
      content: "The localized Agrovet recommendations saved me days of searching. It pointed me exactly to where I could find the DAP and CAN for my specific soil needs.",
      rating: 5,
    },
    {
      name: "Sarah Wanjiru",
      role: "Precision Agronomist",
      content: "The integration with Google Earth Engine for NDVI and SAR data provides a highly accurate environmental signature. It's sophisticated yet remarkably easy for my clients to use.",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How accurate is the ML Predictive Engine?",
      answer: "Our ML engine uses high-resolution satellite data from the Google Earth Engine (Sentinel-1 and MODIS). It achieves over 95% accuracy in estimating Soil Health Index (SHI) by analyzing vegetation trends, soil texture, and surface roughness.",
    },
    {
      question: "What is Hybrid Prediction Mode?",
      answer: "Hybrid mode activates when you provide some lab results but not all. The system uses AI to 'gap-fill' missing nutrients while ensuring your actual lab measurements always override predicted values for total precision.",
    },
    {
      question: "What information do I need to get started?",
      answer: "The minimum requirement is your GPS location and soil pH level. This transitions the system to ML mode. For higher precision, you can optionally provide N, P, K, Organic Carbon, Calcium, and Magnesium levels.",
    },
    {
      question: "How does the Agrovet recommendation work?",
      answer: "We use the Haversine formula to calculate your distance to local agrovets. We then match your specific nutrient deficiencies (e.g., Nitrogen) with the correct products (e.g., CAN) available at those coordinates.",
    },
    {
      question: "Can I track multiple farms?",
      answer: "Absolutely. Kiduka allows you to manage multiple geographical coordinates and track the historical soil health trends for each field independently.",
    },
    {
      question: "What are the scientific rules for SHI Calculation?",
      answer: "Our expert system uses Diagnostic Engine rules—such as the 'pH Cap' where a very poor pH restricts the overall health status, or the 'OC Downgrade' based on Organic Carbon levels.",
    },
  ];

  return (
    <div className="min-h-screen" suppressHydrationWarning>
      {/* Sticky Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-md" : "bg-white/80 backdrop-blur-sm"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => scrollToSection("home")}>
              <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-sm border border-green-100">
                <img src="/images/kiduka_logo.png" alt="Kiduka Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-xl font-serif font-bold text-green-800">Kiduka Labs</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection("home")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Home
              </button>
              <button onClick={() => scrollToSection("architecture")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Architecture
              </button>
              <button onClick={() => scrollToSection("agrovets")} className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Agrovets
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
              <button onClick={() => scrollToSection("architecture")} className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg">
                Architecture
              </button>
              <button onClick={() => scrollToSection("agrovets")} className="block w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg">
                Agrovets
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

      {/* Triple Prediction Mode Architecture */}
      <section id="architecture" className="py-24 bg-white/50 backdrop-blur-sm relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h3 className="text-3xl sm:text-5xl font-serif font-bold text-green-800 mb-6 font-serif">
              Triple Prediction Architecture
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-serif">
              Kiduka intelligently routes analysis through three dynamic modes based on your available data precision.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
            {/* ML Predictive Engine */}
            <Card className="border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-10 space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                  <Cpu className="h-8 w-8 text-green-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-2xl font-serif font-bold text-green-900">ML Predictive Engine</h4>
                  <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 px-3 py-1">Rapid Satellite Analysis</Badge>
                </div>
                <p className="text-gray-600 leading-relaxed font-serif">
                  Leverages Google Earth Engine and high-resolution satellite imagery (NDVI, SAR, SRTM) to estimate nutrients when lab results are unavailable.
                </p>
                <div className="pt-4 border-t border-amber-100">
                  <p className="text-sm font-medium text-green-700 font-serif">Ideal for: Quick environmental assessments</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-10 space-y-6">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 transition-colors duration-300">
                  <Zap className="h-8 w-8 text-amber-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-2xl font-serif font-bold text-green-900">Hybrid Analysis</h4>
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 px-3 py-1">ML-Enhanced Lab Data</Badge>
                </div>
                <p className="text-gray-600 leading-relaxed font-serif">
                  Fills data gaps by merging lab measurements with ML estimations. Real measurements always override predictions for maximum accuracy.
                </p>
                <div className="pt-4 border-t border-amber-100">
                  <p className="text-sm font-medium text-amber-700 font-serif">Ideal for: Partial lab results</p>
                </div>
              </CardContent>
            </Card>

            {/* Formula-Based Diagnostic */}
            <Card className="border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-10 space-y-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                  <Beaker className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-2xl font-serif font-bold text-green-900">Diagnostic Engine</h4>
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 px-3 py-1">High-Precision Formulaic</Badge>
                </div>
                <p className="text-gray-600 leading-relaxed font-serif">
                  A high-precision rule-based model using scientific weighting and expert system filters for precise nutrient recommendations.
                </p>
                <div className="pt-4 border-t border-amber-100">
                  <p className="text-sm font-medium text-blue-700 font-serif">Ideal for: Full laboratory samples</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-5xl font-serif font-bold text-green-800 mb-6 font-serif">
              Data-Driven Agricultural Intelligence
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-serif">
              Our platform harmonizes localized lab data with global satellite imagery through a sophisticated triple-mode architecture.
            </p>
          </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
              <h3 className="text-4xl sm:text-5xl font-serif font-bold leading-tight text-left">
                Advanced Environmental <br />
                <span className="text-green-400">Intelligence Engine</span>
              </h3>
              <p className="text-xl text-gray-600 font-serif leading-relaxed text-left">
                Kiduka fetches and processes high-resolution satellite data from the Google Earth Engine to understand your farm&apos;s unique environmental signature.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-50 rounded-lg"><Globe className="h-5 w-5 text-green-600" /></div>
                  <div className="text-left">
                    <h5 className="font-bold font-serif text-green-900">Vegetation Trends</h5>
                    <p className="text-sm text-gray-600">NDVI imagery assesses historical plant health patterns.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-50 rounded-lg"><Layers className="h-5 w-5 text-green-600" /></div>
                  <div className="text-left">
                    <h5 className="font-bold font-serif text-green-900">Soil Texture</h5>
                    <p className="text-sm text-gray-600">Sand-to-clay ratios via global OpenLandMap data.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-50 rounded-lg"><Zap className="h-5 w-5 text-green-600" /></div>
                  <div className="text-left">
                    <h5 className="font-bold font-serif text-green-900">SAR Data</h5>
                    <p className="text-sm text-gray-600">Sentinel-1 Synthetic Aperture Radar for moisture profiles.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-50 rounded-lg"><Database className="h-5 w-5 text-green-600" /></div>
                  <div className="text-left">
                    <h5 className="font-bold font-serif text-green-900">Climate Patterns</h5>
                    <p className="text-sm text-gray-600 font-serif">CHIRPS historical rainfall and terrain elevation profiles.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-700">
              <img 
                src="/images/precision_ag_intelligence.png" 
                alt="Precision Agriculture Intelligence" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-green-950/20 to-transparent flex flex-col justify-end p-8 text-left">
                <div className="inline-flex items-center gap-2 bg-green-600 px-4 py-1 rounded-full text-xs font-bold mb-4 w-fit text-white">
                  <Cpu className="h-3 w-3" /> NEURAL NETWORK MODELS
                </div>
                <p className="text-lg font-serif italic text-white/90">
                  &quot;Turning complex geospatial data into field-level macronutrient estimations.&quot;
                </p>
              </div>
            </div>
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full text-2xl font-bold font-serif shadow-lg">
                1
              </div>
              <h4 className="text-xl font-serif font-bold text-green-800">
                Data Input
              </h4>
              <p className="text-gray-600 font-serif">
                Input your GPS location and pH for ML analysis, or add partial/full lab results for high-precision diagnostic modes.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-600 text-white rounded-full text-2xl font-bold font-serif shadow-lg">
                2
              </div>
              <h4 className="text-xl font-serif font-bold text-green-800">
                Hybrid Core Analysis
              </h4>
              <p className="text-gray-600 font-serif">
                Our AI-driven engine merges satellite environmental data with user inputs to compute an accurate Soil Health Index (SHI).
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-2xl font-bold font-serif shadow-lg">
                3
              </div>
              <h4 className="text-xl font-serif font-bold text-green-800">
                Precision Action
              </h4>
              <p className="text-gray-600 font-serif">
                Receive localized fertilizer recommendations and a ranked list of the nearest Agrovets to procure the required inputs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Agrovet Intelligence & Recommendation */}
      <section id="agrovets" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="/images/agrovet_store.png" 
                alt="Agrovet Solutions" 
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/40 to-transparent"></div>
            </div>

            <div className="order-1 lg:order-2 space-y-8 text-left">
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-4 py-1 text-sm font-bold">GEOSPATIAL INTELLIGENCE</Badge>
              <h3 className="text-4xl sm:text-5xl font-serif font-bold text-green-900 leading-tight">
                Closing the Loop with <br />
                <span className="text-green-600">Localized Input Access</span>
              </h3>
              <p className="text-xl text-gray-600 font-serif leading-relaxed">
                Kiduka doesn&apos;t just diagnose it streamlines procurement. Our mapping engine uses the Haversine formula to connect you with the exact nutrients your soil needs.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                    <Map className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-green-900 font-serif text-lg">Proximity Ranking</h5>
                    <p className="text-gray-600 font-serif">Spherical distance calculation (Haversine) identifies the 5 nearest Agrovets within a 100km radius.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                    <Search className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-green-900 font-serif text-lg">Nutrient-Based Matching</h5>
                    <p className="text-gray-600 font-serif">Dynamically aligns predicted deficiencies with specific products like CAN, DAP, or Organic Manure.</p>
                  </div>
                </div>
              </div>
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
                    &quot;{testimonial.content}&quot;
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
                className="bg-transparent border-2 border-white text-white hover:bg-white/10 hover:text-white px-8 py-6 text-lg font-semibold"
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
                <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="/images/kiduka_logo.png" alt="Kiduka Logo" className="h-full w-full object-cover" />
                </div>
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
                  <button onClick={() => scrollToSection("architecture")} className="hover:text-white transition-colors">
                    Architecture
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("agrovets")} className="hover:text-white transition-colors">
                    Agrovets
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
