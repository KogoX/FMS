"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Search, Plus } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import type { FoodItem } from "@/lib/store"

interface SearchScreenProps {
  initialCategory?: string
  onSelectItem: (item: FoodItem) => void
  onAddToCart: (item: FoodItem) => void
  foodItems: FoodItem[]
  loading?: boolean
}

const categoryFilters = ["All", "Burgers", "Pizza", "Burrito"]

export function SearchScreen({
  initialCategory,
  onSelectItem,
  onAddToCart,
  foodItems,
  loading,
}: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState(
    initialCategory || "All"
  )

  const filteredItems = useMemo(() => {
    return foodItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, activeCategory, foodItems])

  return (
    <div className="flex flex-col pb-20">
      {/* Header */}
      <header className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
          Search
        </p>
        <h1 className="text-xl font-bold text-foreground mt-0.5 text-balance">
          {"Find your Favorite Food"}
        </h1>
      </header>

      {/* Search Bar */}
      <div className="px-5 mt-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for any food"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary rounded-xl py-3 pl-4 pr-12 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground"
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-primary w-9 h-9 rounded-lg flex items-center justify-center"
            aria-label="Search"
          >
            <Search size={16} className="text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 px-5 mt-4 overflow-x-auto no-scrollbar">
        {categoryFilters.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center px-5 mt-16">
          <LoadingSpinner size="md" label="Loading menu" sublabel="Fetching delicious options" variant="inline" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 mt-16">
          <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Search size={48} className="text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Nothing matched your search
          </h3>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Try a different search term or check for typos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 px-5 mt-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectItem(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectItem(item)
                }
              }}
              className="flex flex-col bg-card rounded-2xl overflow-hidden border border-border text-left group cursor-pointer"
            >
              <div className="relative w-full aspect-square bg-secondary overflow-hidden">
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-foreground leading-tight">
                  {item.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  From ${item.price.toFixed(1)}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToCart(item)
                  }}
                  className="flex items-center gap-1 text-primary text-xs font-semibold mt-1 hover:opacity-80 transition-opacity"
                >
                  <Plus size={14} />
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
