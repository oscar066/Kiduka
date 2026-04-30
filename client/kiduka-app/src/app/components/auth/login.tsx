"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { FaGoogle } from "react-icons/fa";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const { status } = useSession();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email/username and password.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        username_or_email: email,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(
          "Invalid email/username or password. Please try again."
        );
      } else if (result?.ok) {
        const session = await getSession();
        if (session) {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      console.error("Login failed:", err);
      setErrorMessage("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setErrorMessage("Google sign-in failed. Please try again.");
      }
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setErrorMessage("Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-800">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-400" />
          <span className="text-green-300 font-serif">Loading...</span>
        </div>
      </div>
    );
  }

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
                <img src="/images/kiduka_logo.png" alt="Kiduka Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-2xl font-serif font-bold text-white">Kiduka Labs</span>
            </Link>
          </div>

          <div className="max-w-xl space-y-10">
            <div className="space-y-5">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-400">
                Welcome back
              </span>
              <h2 className="text-4xl font-serif font-bold text-white leading-tight">
                Back to your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-amber-300">
                  soil analysis
                </span>
              </h2>
              <p className="text-lg text-green-300/80 leading-relaxed">
                Access AI-driven insights for better farming decisions.
              </p>
            </div>

            <div className="space-y-5">
              {[
                "Real-time soil monitoring",
                "Personalized recommendations",
                "24/7 data access",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-800/60 rounded-lg flex items-center justify-center border border-green-700/50">
                    <CheckCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-green-200 text-base font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-green-800/60 pt-8">
            <p className="text-green-500 text-xs">© {new Date().getFullYear()} Kiduka Labs. All rights reserved.</p>
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
                <img src="/images/kiduka_logo.png" alt="Kiduka Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-xl font-serif font-bold text-green-900">Kiduka Labs</span>
            </Link>
          </div>

          <div className="space-y-2 mb-10">
            <h1 className="text-3xl font-serif font-bold text-green-900">Sign in</h1>
            <p className="text-base text-gray-500">Enter your credentials to access your dashboard</p>
          </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                <p className="text-red-700 text-sm flex items-center">
                  <span className="mr-2">⚠️</span>
                  {errorMessage}
                </p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email or Username
                </Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or username"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  className="h-12 border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-green-600 hover:text-green-700 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect="off"
                    disabled={isLoading}
                    className="h-12 pr-10 border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <BsEyeFill className="h-5 w-5" />
                    ) : (
                      <BsEyeSlashFill className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-amber-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-500 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="w-full h-12 border-amber-200 hover:bg-green-50 hover:border-green-300 transition-all"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <FaGoogle className="mr-2 h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">Google</span>
            </Button>

            <p className="mt-8 text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
  );
}
