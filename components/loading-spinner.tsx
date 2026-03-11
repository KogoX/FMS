"use client"

import { useEffect, useState } from "react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  label?: string
  sublabel?: string
  variant?: "default" | "inline" | "fullscreen"
}

const sizeMap = {
  sm: { outer: 32, inner: 24, stroke: 3, icon: 10 },
  md: { outer: 56, inner: 44, stroke: 4, icon: 16 },
  lg: { outer: 80, inner: 64, stroke: 5, icon: 22 },
}

export function LoadingSpinner({
  size = "md",
  label,
  sublabel,
  variant = "default",
}: LoadingSpinnerProps) {
  const [mounted, setMounted] = useState(false)
  const [dotIndex, setDotIndex] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!label) return
    const interval = setInterval(() => {
      setDotIndex((prev) => (prev + 1) % 4)
    }, 400)
    return () => clearInterval(interval)
  }, [label])

  const s = sizeMap[size]
  const radius = (s.inner - s.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dots = ".".repeat(dotIndex)

  const spinner = (
    <div
      className={`flex flex-col items-center gap-3 transition-opacity duration-500 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative" style={{ width: s.outer, height: s.outer }}>
        {/* Background ring */}
        <svg
          width={s.outer}
          height={s.outer}
          viewBox={`0 0 ${s.outer} ${s.outer}`}
          className="absolute inset-0"
        >
          <circle
            cx={s.outer / 2}
            cy={s.outer / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={s.stroke}
          />
        </svg>

        {/* Animated arc */}
        <svg
          width={s.outer}
          height={s.outer}
          viewBox={`0 0 ${s.outer} ${s.outer}`}
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: "1s" }}
        >
          <circle
            cx={s.outer / 2}
            cy={s.outer / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
          />
        </svg>

        {/* Second arc (opposite direction, lighter) */}
        <svg
          width={s.outer}
          height={s.outer}
          viewBox={`0 0 ${s.outer} ${s.outer}`}
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: "1.8s", animationDirection: "reverse" }}
        >
          <circle
            cx={s.outer / 2}
            cy={s.outer / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={s.stroke - 1}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.15} ${circumference * 0.85}`}
            opacity={0.3}
          />
        </svg>

        {/* Center icon */}
        {size !== "sm" && (
          <div
            className="absolute inset-0 flex items-center justify-center animate-pulse"
            style={{ animationDuration: "1.5s" }}
          >
            <svg
              width={s.icon}
              height={s.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Fork/spoon icon */}
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
              <path d="M7 2v20" />
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
            </svg>
          </div>
        )}
      </div>

      {label && (
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-medium text-foreground">
            {label}
            <span className="inline-block w-6 text-left text-muted-foreground">{dots}</span>
          </p>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      )}
    </div>
  )

  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 bg-card/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  if (variant === "inline") {
    return spinner
  }

  return (
    <div className="flex items-center justify-center py-8">{spinner}</div>
  )
}

/** Small inline spinner for buttons */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      className={`animate-spin ${className || ""}`}
      style={{ animationDuration: "0.8s" }}
    >
      <circle
        cx={8}
        cy={8}
        r={6}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * 6 * 0.3} ${2 * Math.PI * 6 * 0.7}`}
      />
    </svg>
  )
}
