"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2, Leaf } from "lucide-react";
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

  // Dummy user data for authentication
  const dummyUsers = [
    {
      email: "farmer@soiltech.com",
      password: "password123",
      name: "John Farmer",
    },
    { email: "admin@soiltech.com", password: "admin123", name: "Admin User" },
    { email: "demo@kiduka.com", password: "demo123", name: "Demo User" },
  ];

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check dummy credentials
      const user = dummyUsers.find(
        (u) => u.email === email && u.password === password
      );

      if (user) {
        // Store user session in localStorage (for demo purposes)
        localStorage.setItem(
          "soiltech_user",
          JSON.stringify({
            email: user.email,
            name: user.name,
            loginTime: new Date().toISOString(),
          })
        );

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setErrorMessage("Invalid email or password. Please try again.");
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
    try {
      // Simulate Google OAuth
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Auto-login with demo user
      localStorage.setItem(
        "soiltech_user",
        JSON.stringify({
          email: "demo@kiduka.com",
          name: "Demo User (Google)",
          loginTime: new Date().toISOString(),
        })
      );

      router.push("/dashboard");
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setErrorMessage("Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
      <div className="w-full max-w-md px-4 py-8">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-amber-200">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <Link
              href="/"
              className="flex items-center justify-center space-x-2"
            >
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-2xl font-serif font-bold bg-gradient-to-r from-green-600 to-amber-600 bg-clip-text text-transparent">
                Kiduka
              </span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-green-800">
              Welcome back
            </h1>
            <p className="text-sm text-green-600">
              Enter your credentials to access your soil analysis dashboard
            </p>
          </div>

          {/* Demo Credentials Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-1">
              Demo Credentials:
            </p>
            <p className="text-xs text-blue-700">Email: demo@kiduka.com</p>
            <p className="text-xs text-blue-700">Password: demo123</p>
          </div>

          {errorMessage && (
            <p className="text-red-600 text-center mb-4 text-sm">
              {errorMessage}
            </p>
          )}

          <div className="grid gap-6">
            <form onSubmit={onSubmit}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    className="border-amber-200 focus:border-green-500"
                  />
                </div>
                <div className="grid gap-1 relative">
                  <Label className="sr-only" htmlFor="password">
                    Password
                  </Label>
                  <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect="off"
                    disabled={isLoading}
                    className="border-amber-200 focus:border-green-500"
                  />
                  <div
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <BsEyeFill className="text-gray-500" />
                    ) : (
                      <BsEyeSlashFill className="text-gray-500" />
                    )}
                  </div>
                </div>
                <Button
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Sign In
                </Button>
              </div>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-amber-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="border-amber-200 hover:bg-green-50"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaGoogle className="mr-2 h-4 w-4" />
              )}
              Google
            </Button>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              <Link
                href="/auth/forgot-password"
                className="hover:text-green-600 underline underline-offset-4"
              >
                Forgot your password?
              </Link>
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="hover:text-green-600 underline underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
