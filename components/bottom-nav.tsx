"use client"

import { Home, Search, ShoppingBag, User, ClipboardList } from "lucide-react"

export type Screen = "home" | "search" | "cart" | "profile" | "product-detail" | "orders" | "receipt"

interface BottomNavProps {
  active: Screen
  onNavigate: (screen: Screen) => void
  cartCount: number
}

export function BottomNav({ active, onNavigate, cartCount }: BottomNavProps) {
  const items = [
    { id: "home" as Screen, label: "Home", icon: Home },
    { id: "search" as Screen, label: "Search", icon: Search },
    { id: "cart" as Screen, label: "Cart", icon: ShoppingBag },
    { id: "orders" as Screen, label: "Orders", icon: ClipboardList },
    { id: "profile" as Screen, label: "Profile", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto" role="navigation" aria-label="Main navigation">
      <div className="flex items-center justify-around py-2 pb-safe md:py-3">
        {items.map((item) => {
          const isActive = active === item.id || (active === "product-detail" && item.id === "search") || (active === "receipt" && item.id === "orders")
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                {item.id === "cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
