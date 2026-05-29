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

const navLinks = [
  { label: "Architecture", section: "architecture" },
  { label: "How It Works", section: "how-it-works" },
  { label: "Agrovets", section: "agrovets" },
  { label: "Testimonials", section: "testimonials" },
  { label: "FAQ", section: "faq" },
];

export function NavigationBar({
  isScrolled,
  isMenuOpen,
  setIsMenuOpen,
  scrollToSection,
}: NavigationBarProps) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-gradient-to-r from-green-950 via-green-900 to-emerald-800 shadow-lg border-b border-green-800/40"
          : "bg-transparent"
      }`}
    >
      {/* Grid pattern — matches the hero section */}
      {isScrolled && (
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={() => scrollToSection("home")}
          >
            <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-sm border border-green-100">
              <img
                src="/images/kiduka_logo.png"
                alt="Kiduka Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xl font-serif font-bold text-white">
              Kiduka Labs
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ label, section }) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors text-green-200 hover:text-white hover:bg-white/10"
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                size="sm"
                className="font-medium transition-colors text-green-200 hover:text-white hover:bg-white/10"
              >
                Login
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
              >
                Sign Up Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors text-white hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-green-950/95 backdrop-blur-md border-t border-green-800/60">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ label, section }) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className="block w-full text-left px-4 py-2.5 text-green-200 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
              >
                {label}
              </button>
            ))}
            <div className="pt-3 pb-1 space-y-2 border-t border-green-800/60 mt-2">
              <Link href="/auth/login" className="block">
                <Button variant="outline" className="w-full border-green-600 text-green-200 hover:bg-white/10 hover:text-white bg-transparent">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup" className="block">
                <Button className="w-full bg-green-400 hover:bg-green-300 text-green-950 font-semibold">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
