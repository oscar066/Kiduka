"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2, Leaf, ArrowRight, CheckCircle } from "lucide-react";
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
  const { data: session, status } = useSession();

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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-green-800 font-serif">Loading...</span>
        </div>
      </div>
    );
  }

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
              Welcome back to your<br />
              <span className="text-green-200">soil analysis platform</span>
            </h2>
            <p className="text-xl text-green-50 leading-relaxed font-light opacity-90">
              Access powerful AI-driven insights for optimal crop yields and sustainable farming practices.
            </p>
          </div>
          
          <div className="space-y-5 mt-12">
            {[
              "Real-time soil health monitoring",
              "Personalized fertilizer recommendations",
              "Historical data tracking"
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
          <div className="text-green-200 text-sm font-medium">
            © {new Date().getFullYear()} Kiduka Labs
          </div>
          <div className="flex space-x-6 text-green-200/60 text-xs">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
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
                Sign in
              </h1>
              <p className="text-gray-600">
                Enter your credentials to access your dashboard
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
                <span className="bg-white/80 px-3 text-gray-500 font-medium">
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
              Don't have an account?{" "}
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
    </div>
  );
}
