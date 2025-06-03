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

// Define user type interface
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  role: string;
  provider?: string;
}

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem("soiltech_user");
    if (user) {
      router.push("/dashboard");
    }
  }, [router]);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!username || !email || !password || !confirmPassword) {
      setErrorMessage("All fields are required.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setIsLoading(false);
      setErrorMessage("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("You must agree to the terms and conditions.");
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if email already exists
      const existingUsers: User[] = JSON.parse(
        localStorage.getItem("soiltech_users") || "[]"
      );
      const emailExists = existingUsers.some(
        (user: User) => user.email === email
      );

      if (emailExists) {
        setErrorMessage("An account with this email already exists");
        setIsLoading(false);
        return;
      }

      // Create new user
      const newUser: User = {
        id: Date.now().toString(),
        username,
        email,
        password, // In real app, this would be hashed
        createdAt: new Date().toISOString(),
        role: "farmer",
      };

      // Save to localStorage (demo purposes)
      const updatedUsers = [...existingUsers, newUser];
      localStorage.setItem("soiltech_users", JSON.stringify(updatedUsers));

      // Auto-login after successful registration
      localStorage.setItem(
        "soiltech_user",
        JSON.stringify({
          email: newUser.email,
          name: newUser.username,
          loginTime: new Date().toISOString(),
        })
      );

      console.log("Registration successful:", newUser);

      // Clear form
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setTermsAccepted(false);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Registration failed:", err);
      setErrorMessage("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      // Simulate Google OAuth
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Auto-create account with demo user
      const newUser: User = {
        id: Date.now().toString(),
        username: "Demo User",
        email: "demo.google@soiltech.com",
        password: "google_auth",
        createdAt: new Date().toISOString(),
        role: "farmer",
        provider: "google",
      };

      const existingUsers: User[] = JSON.parse(
        localStorage.getItem("soiltech_users") || "[]"
      );
      const updatedUsers = [...existingUsers, newUser];
      localStorage.setItem("soiltech_users", JSON.stringify(updatedUsers));

      // Auto-login
      localStorage.setItem(
        "soiltech_user",
        JSON.stringify({
          email: newUser.email,
          name: newUser.username,
          loginTime: new Date().toISOString(),
        })
      );

      router.push("/dashboard");
    } catch (err) {
      console.error("Google sign-up failed:", err);
      setErrorMessage("Google sign-up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
            <p className="text-red-600 text-center mb-4 text-sm">
              {errorMessage}
            </p>
          )}
          <div className="grid gap-6">
            <form onSubmit={onSubmit}>
              <div className="grid gap-2">
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
                    autoCapitalize="words"
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
                    placeholder="Password"
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
              href="/login"
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
