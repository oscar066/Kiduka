"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, BarChart3, MapPin, CheckCircle, ArrowRight, Sprout, TestTube, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center space-y-8">
            {/* Logo/Brand */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-600 rounded-2xl">
                  <Leaf className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-serif font-bold text-green-800">
                  Kiduka Labs
                </h1>
              </div>
            </div>

            {/* Headline */}
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

            {/* CTA Buttons */}
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

            {/* Trust Indicator */}
            <div className="pt-8 flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Trusted by farmers and agronomists worldwide</p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
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
            {/* Feature 1 */}
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

            {/* Feature 2 */}
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

            {/* Feature 3 */}
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
      <section className="py-20">
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
            {/* Step 1 */}
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

            {/* Step 2 */}
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

            {/* Step 3 */}
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
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Leaf className="h-6 w-6 text-green-400" />
                <span className="text-xl font-serif font-bold text-white">Kiduka Labs</span>
              </div>
              <p className="text-green-200 text-sm">
                Empowering agriculture through intelligent soil analysis and data-driven insights.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h5 className="text-white font-semibold">Quick Links</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/auth/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup" className="hover:text-white transition-colors">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
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
