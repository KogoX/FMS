"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"

interface LoginSuccessProps {
  onContinue: () => void
}

export function LoginSuccess({ onContinue }: LoginSuccessProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-card px-6">
      <div
        className={`w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 transition-all duration-700 ${
          animated ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
          <Check className="text-primary-foreground" size={32} strokeWidth={3} />
        </div>
      </div>

      <h2
        className={`text-2xl font-bold text-foreground mb-2 transition-all duration-700 delay-300 ${
          animated ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        Login Successful
      </h2>
      <p
        className={`text-muted-foreground text-sm text-center mb-10 transition-all duration-700 delay-500 ${
          animated ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {"You're all set to continue where you left off."}
      </p>

      <button
        type="button"
        onClick={onContinue}
        className={`w-full bg-primary text-primary-foreground py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all duration-700 delay-700 ${
          animated ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        Go to homepage
      </button>
    </div>
  )
}
