"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, CheckCircle, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Please enter your email address.");
      setLoading(false);
      return;
    }

    // TODO: Implement actual password reset functionality
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden">
      {/* Left Panel - Dark Green with Grid */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-950 via-green-900 to-emerald-800 relative overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Ambient blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000 pointer-events-none" />

        {/* Branding Content */}
        <div className="relative z-10 p-16 flex flex-col justify-between w-full">
          <div>
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-11 w-11 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg border border-green-700">
                <img
                  src="/images/kiduka_logo.png"
                  alt="Kiduka Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-2xl font-serif font-bold text-white">
                Kiduka Labs
              </span>
            </Link>
          </div>

          <div className="max-w-xl space-y-10">
            <div className="space-y-5">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-400">
                Account recovery
              </span>
              <h2 className="text-4xl font-serif font-bold text-white leading-tight">
                Reset your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-amber-300">
                  password
                </span>
              </h2>
              <p className="text-lg text-green-300/80 leading-relaxed">
                We'll send you a secure link to get back into your account.
              </p>
            </div>

            <div className="space-y-5">
              {[
                "Secure password reset link",
                "Valid for 24 hours",
                "No account? Sign up for free",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-800/60 rounded-lg flex items-center justify-center border border-green-700/50">
                    <CheckCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-green-200 text-base font-medium">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-green-800/60 pt-8">
            <p className="text-green-500 text-xs">
              © {new Date().getFullYear()} Kiduka Labs. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - White with Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-9 w-9 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center overflow-hidden shadow">
                <img
                  src="/images/kiduka_logo.png"
                  alt="Kiduka Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-xl font-serif font-bold text-green-900">
                Kiduka Labs
              </span>
            </Link>
          </div>

          {submitted ? (
            /* Success state */
            <div className="text-center space-y-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <KeyRound className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-serif font-bold text-green-900">
                  Check your email
                </h1>
                <p className="text-base text-gray-500">
                  If an account exists for{" "}
                  <span className="font-semibold text-gray-700">{email}</span>,
                  you will receive reset instructions shortly.
                </p>
              </div>
              <Button
                asChild
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/auth/login">
                  Back to Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-gray-500">
                Didn&apos;t receive the email?{" "}
                <button
                  onClick={() => setSubmitted(false)}
                  className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="space-y-2 mb-10">
                <h1 className="text-3xl font-serif font-bold text-green-900">
                  Forgot password?
                </h1>
                <p className="text-base text-gray-500">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <p className="text-red-700 text-sm flex items-center">
                    <span className="mr-2">⚠️</span>
                    {errorMessage}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    className="h-12 border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-gray-600">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
