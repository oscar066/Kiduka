"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface NavigationBarProps {
  isScrolled: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  scrollToSection: (sectionId: string) => void;
}

export function NavigationBar({ isScrolled, isMenuOpen, setIsMenuOpen, scrollToSection }: NavigationBarProps) {
  return (
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
  );
}
