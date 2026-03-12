"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowLeft, Search, Star, Truck, Clock, Minus, Plus } from "lucide-react"
import type { FoodItem } from "@/lib/store"

interface ProductDetailProps {
  item: FoodItem
  onBack: () => void
  onAddToCart: (item: FoodItem, quantity: number, toppings: string[], sides: string[]) => void
}

export function ProductDetail({ item, onBack, onAddToCart }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(2)
  const [selectedToppings, setSelectedToppings] = useState<string[]>(["Tomato", "Cheese"])
  const [selectedSides, setSelectedSides] = useState<string[]>(["Fries"])

  const toggleTopping = (name: string) => {
    setSelectedToppings((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    )
  }

  const toggleSide = (name: string) => {
    setSelectedSides((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
  }

  const totalPrice = (item.price * quantity).toFixed(0)

  return (
    <div className="flex flex-col pb-24 bg-card min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Search"
        >
          <Search size={20} className="text-foreground" />
        </button>
      </header>

      {/* Product Image & Info */}
      <div className="flex px-5 mt-2 gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{item.name}</h1>
          <p className="text-xs text-muted-foreground">{item.category === "Burgers" ? "Cheeseburger" : item.category}</p>

          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={`star-${item.id}-${i}`}
                size={12}
                className={i < Math.floor(item.rating) ? "fill-primary text-primary" : "text-muted-foreground/30"}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">{item.rating}/5</span>
          </div>

          <p className="text-2xl font-bold text-foreground mt-3">KSh {item.price.toFixed(2)}</p>

          <div className="flex gap-4 mt-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">Calories</span>
              <span className="text-sm font-bold text-foreground">{item.calories} Cal</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">Protein</span>
              <span className="text-sm font-bold text-foreground">{item.protein}</span>
            </div>
          </div>

          {item.bunType && (
            <div className="mt-2">
              <span className="text-[10px] text-muted-foreground">Bun Type</span>
              <p className="text-sm font-semibold text-foreground">{item.bunType}</p>
            </div>
          )}
        </div>

        <div className="w-32 h-32 rounded-full overflow-hidden bg-secondary flex-shrink-0 relative">
          <Image
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-3 px-5 mt-4">
        <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
          <Truck size={12} className="text-primary" />
          <span className="text-[10px] font-medium text-foreground">Free Delivery</span>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
          <Clock size={12} className="text-primary" />
          <span className="text-[10px] font-medium text-foreground">{item.deliveryTime}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
          <Star size={12} className="fill-primary text-primary" />
          <span className="text-[10px] font-medium text-foreground">{item.rating}</span>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 mt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>

      {/* Toppings */}
      <div className="px-5 mt-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Toppings</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {item.toppings.map((topping) => {
            const isSelected = selectedToppings.includes(topping.name)
            return (
              <button
                key={topping.name}
                type="button"
                onClick={() => toggleTopping(topping.name)}
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 ${
                  isSelected ? "opacity-100" : "opacity-50"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-colors ${
                    isSelected ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image
                    src={topping.image || "/placeholder.svg"}
                    alt={topping.name}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="text-[10px] font-medium text-foreground">{topping.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Side Options */}
      <div className="px-5 mt-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Side options</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {item.sides.map((side) => {
            const isSelected = selectedSides.includes(side.name)
            return (
              <button
                key={side.name}
                type="button"
                onClick={() => toggleSide(side.name)}
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 ${
                  isSelected ? "opacity-100" : "opacity-50"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-colors ${
                    isSelected ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image
                    src={side.image || "/placeholder.svg"}
                    alt={side.name}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="text-[10px] font-medium text-foreground">{side.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quantity & Add to Cart */}
      <div className="flex items-center justify-between px-5 mt-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <span className="text-lg font-bold text-foreground w-6 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onAddToCart(item, quantity, selectedToppings, selectedSides)}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Add to cart (KSh {totalPrice})
        </button>
      </div>
    </div>
  )
}
