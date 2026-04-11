"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, Leaf, ArrowRight, CheckCircle, Shield } from "lucide-react";
import Link from "next/link";
import { FaGoogle } from "react-icons/fa";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username || !email || !password || !confirmPassword || !fullName) {
      setErrorMessage("All fields are required.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("You must agree to the terms and conditions.");
      setIsLoading(false);
      return;
    }

    try {
      await apiClient.register({
        username,
        email,
        password,
        full_name: fullName,
      });

      setSuccessMessage("Account created successfully! Signing you in...");

      const signInResult = await signIn("credentials", {
        username_or_email: email,
        password: password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/dashboard");
      } else {
        setSuccessMessage("Account created successfully! Please log in.");
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      setErrorMessage(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setErrorMessage("Google sign-up failed. Please try again.");
      }
    } catch (err) {
      console.error("Google sign-up failed:", err);
      setErrorMessage("Google sign-up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-green-800 font-serif">Loading...</span>
        </div>
      </div>
    );
  }
d
  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-green-50 via-white to-amber-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItNHYyczIgMCAyIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-4 group">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md border border-white/25 group-hover:bg-white/25 transition-all duration-300">
              <Leaf className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-serif font-bold text-white tracking-tight">Kiduka Labs</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="space-y-6">
            <h2 className="text-5xl font-serif font-bold text-white leading-[1.15]">
              Join thousands of<br />
              <span className="text-green-200">successful farmers</span>
            </h2>
            <p className="text-xl text-green-50 leading-relaxed font-light opacity-90">
              Start your journey to optimized soil fertility and improved crop yields with our AI-powered platform.
            </p>
          </div>
          
          <div className="space-y-5 mt-12">
            {[
              "Free soil analysis tools",
              "Instant AI recommendations",
              "24/7 access to your data"
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-4 animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                </div>
                <span className="text-green-50 font-medium text-lg leading-none">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-8 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-green-200 text-sm font-medium">
            <Shield className="h-4 w-4" />
            <span>Secure & Encrypted</span>
          </div>
          <div className="flex space-x-6 text-green-200/60 text-xs">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-sm p-8 lg:p-10 rounded-2xl shadow-2xl border border-amber-200">
            {/* Mobile Logo */}
            <div className="lg:hidden flex flex-col space-y-2 text-center mb-8">
              <Link href="/" className="flex items-center justify-center space-x-2">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600">
                    <Leaf className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                </div>
                <span className="text-2xl font-serif font-bold bg-gradient-to-r from-green-600 to-amber-600 bg-clip-text text-transparent">
                  Kiduka Labs
                </span>
              </Link>
            </div>

            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-serif font-bold text-green-800">
                Create account
              </h1>
              <p className="text-gray-600">
                Get started with your free account today
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

            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                <p className="text-green-700 text-sm flex items-center">
                  <span className="mr-2">✓</span>
                  {successMessage}
                </p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  type="text"
                  autoCapitalize="words"
                  autoComplete="name"
                  disabled={isLoading}
                  className="h-11 border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="username"
                  disabled={isLoading}
                  className="h-11 border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-11 border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="h-11 pr-10 border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500 transition-all"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className={`h-11 pr-10 transition-all ${
                      password !== confirmPassword && confirmPassword
                        ? "border-red-500 focus-visible:ring-red-500"
                        : "border-amber-200 focus-visible:ring-green-500 focus-visible:border-green-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <BsEyeFill className="h-5 w-5" />
                    ) : (
                      <BsEyeSlashFill className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-0.5 border-amber-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 leading-snug">
                  I agree to the{" "}
                  <Link href="/terms" className="text-green-600 hover:text-green-700 underline font-medium">
                    terms and conditions
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-green-600 hover:text-green-700 underline font-medium">
                    privacy policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
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
                <span className="bg-white/80 px-3 text-gray-500 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignup}
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
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
