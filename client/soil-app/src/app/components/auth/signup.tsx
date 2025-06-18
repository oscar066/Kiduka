"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, Leaf } from "lucide-react";
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
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
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
    setSuccessMessage(null);

    // Validation
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
      // Register user via FastAPI backend using apiClient
      await apiClient.register({
        username,
        email,
        password,
        full_name: fullName,
      });

      // Registration successful, now sign in
      setSuccessMessage("Account created successfully! Signing you in...");

      // Auto-login after successful registration
      const signInResult = await signIn("credentials", {
        username_or_email: email,
        password: password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/dashboard");
      } else {
        // Registration was successful but auto-login failed
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

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-green-800">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
      <div className="w-full max-w-md px-4 py-8 flex-col">
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
              <span className="text-2xl font-bold font-serif bg-gradient-to-r from-green-600 to-amber-600 bg-clip-text text-transparent">
                Kiduka
              </span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-green-800">
              Create an account
            </h1>
            <p className="text-sm text-green-600">
              Enter your details below to create your account
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-center text-sm">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-center text-sm">
                {successMessage}
              </p>
            </div>
          )}

          <div className="grid gap-6">
            <form onSubmit={onSubmit}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="fullName">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="name"
                    autoCorrect="off"
                    disabled={isLoading}
                    className="border-amber-200 focus:border-green-500"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="username">
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    type="text"
                    autoCapitalize="none"
                    autoComplete="username"
                    autoCorrect="off"
                    disabled={isLoading}
                    className="border-amber-200 focus:border-green-500"
                  />
                </div>
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
                    placeholder="Password (min. 6 characters)"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="new-password"
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
                <div className="grid gap-1 relative">
                  <Label className="sr-only" htmlFor="confirm-password">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect="off"
                    disabled={isLoading}
                    className={`border-amber-200 focus:border-green-500 ${
                      password !== confirmPassword && confirmPassword
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  <div
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <BsEyeFill className="text-gray-500" />
                    ) : (
                      <BsEyeSlashFill className="text-gray-500" />
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) =>
                      setTermsAccepted(checked as boolean)
                    }
                    className="border-amber-300 data-[state=checked]:bg-green-600"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none text-gray-600"
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-green-600 underline hover:text-green-700"
                    >
                      terms and conditions
                    </Link>
                  </label>
                </div>
                <Button
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Sign Up
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
              onClick={handleGoogleSignup}
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
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-green-600 hover:text-green-700 underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
