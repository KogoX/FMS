"use client"

import React from "react"
import { useState } from "react"
import Image from "next/image"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { signIn, signUp, signInWithProvider } from "@/app/actions/auth"

interface AuthScreenProps {
  onLogin: (user: { id: string; email: string; fullName: string }) => void
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [tab, setTab] = useState<"login" | "signup">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (tab === "signup") {
        const result = await signUp(formData.email, formData.password, formData.fullName)
        if (result.error) {
          setError(result.error)
          setLoading(false)
          return
        }
        // Check if email confirmation is needed
        if (result.data?.user && !result.data.session) {
          setSignUpSuccess(true)
          setLoading(false)
          return
        }
        // If auto-confirmed, log them in
        if (result.data?.user && result.data.session) {
          onLogin({
            id: result.data.user.id,
            email: result.data.user.email || formData.email,
            fullName: formData.fullName,
          })
        }
      } else {
        const result = await signIn(formData.email, formData.password)
        if (result.error) {
          setError(result.error)
          setLoading(false)
          return
        }
        if (result.data?.user) {
          onLogin({
            id: result.data.user.id,
            email: result.data.user.email || formData.email,
            fullName: result.data.user.user_metadata?.full_name || "",
          })
        }
      }
    } catch {
      setError("An unexpected error occurred")
    }
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithProvider(provider)
      if (result.error) {
        setError(result.error)
      } else if (result.data?.url) {
        window.location.href = result.data.url
      }
    } catch {
      setError("An unexpected error occurred")
    }
    setLoading(false)
  }

  if (signUpSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-card px-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Image src="/images/logo.jpg" alt="FoodGo" width={48} height={48} className="rounded-full" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2 text-center">Check your email</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {"We've sent a confirmation link to"} <span className="font-semibold text-foreground">{formData.email}</span>.
          Please verify your email to continue.
        </p>
        <button
          type="button"
          onClick={() => {
            setSignUpSuccess(false)
            setTab("login")
          }}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Back to Login
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <div className="flex flex-col items-start px-6 pt-10 pb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden mb-4">
          <Image
            src="/images/logo.jpg"
            alt="FoodGo Logo"
            width={64}
            height={64}
            className="object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Get Started now</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create an account or log in to explore
        </p>
      </div>

      <div className="px-6">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(null) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "login"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(null) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "signup"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 mt-6 flex-1">
        {tab === "signup" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-xs text-muted-foreground">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="Adrian Hajdin"
              className="border-b border-border pb-2 text-sm text-foreground bg-transparent outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs text-muted-foreground">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="adrian@gmail.com"
            className="border-b border-border pb-2 text-sm text-foreground bg-transparent outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Enter your password"
              className="w-full border-b border-border pb-2 text-sm text-foreground bg-transparent outline-none focus:border-primary transition-colors pr-10 placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-lg font-semibold text-sm mt-2 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {tab === "login" ? "Logging in..." : "Creating account..."}
            </>
          ) : (
            tab === "login" ? "Login" : "Sign Up"
          )}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          {tab === "login" ? (
            <>
              {"Don't have an account? "}
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(null) }}
                className="text-primary font-semibold"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setTab("login"); setError(null) }}
                className="text-primary font-semibold"
              >
                Login
              </button>
            </>
          )}
        </p>
        
        <div className="relative mt-4 mb-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
            <span className="bg-card px-3 text-muted-foreground/60">
              Or continue with
            </span>
          </div>
        </div>
        
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="flex-1 bg-secondary text-foreground py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 border border-border disabled:opacity-70"
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("facebook")}
            disabled={loading}
            className="flex-1 bg-[#1877F2] text-white py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
          >
            Facebook
          </button>
        </div>
      </form>
    </div>
  )
}
