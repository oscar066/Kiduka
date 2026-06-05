"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { BsEyeFill, BsEyeSlashFill } from "react-icons/bs";
import { apiClient } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get("token");
    if (!t) {
      setErrorMessage("Missing reset token. Please use the link from your email.");
    } else {
      setToken(t);
    }
  }, [searchParams]);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!password || !confirmPassword) {
      setErrorMessage("Please fill in both password fields.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      await apiClient.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(
        error.message || "Invalid or expired reset link. Please request a new one."
      );
    } finally {
      setIsLoading(false);
    }
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
                Account recovery
              </span>
              <h2 className="text-4xl font-serif font-bold text-white leading-tight">
                Choose a new<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-amber-300">
                  password
                </span>
              </h2>
              <p className="text-lg text-green-300/80 leading-relaxed">
                Pick a strong password to keep your account secure.
              </p>
            </div>

            <div className="space-y-5">
              {[
                "At least 8 characters required",
                "Reset link is valid for 1 hour",
                "You'll be redirected to sign in",
              ].map((tip, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-800/60 rounded-lg flex items-center justify-center border border-green-700/50">
                    <CheckCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-green-200 text-base font-medium">{tip}</span>
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

          {success ? (
            /* Success state */
            <div className="text-center space-y-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-serif font-bold text-green-900">
                  Password updated!
                </h1>
                <p className="text-base text-gray-500">
                  Your password has been changed. Redirecting you to sign in…
                </p>
              </div>
              <Button
                asChild
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/auth/login">
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="space-y-2 mb-10">
                <h1 className="text-3xl font-serif font-bold text-green-900">
                  Set new password
                </h1>
                <p className="text-base text-gray-500">
                  Enter a new password for your account.
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
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    New Password
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
                      disabled={isLoading || !token}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      disabled={isLoading || !token}
                      className={`h-12 pr-10 transition-all ${
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

                <Button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      Set New Password
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-800">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-green-400" />
            <span className="text-green-300 font-serif">Loading...</span>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
