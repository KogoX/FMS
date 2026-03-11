"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  MapPin,
  ChevronDown,
  Bell,
  Loader2,
  Search,
  Navigation,
  X,
  Clock,
} from "lucide-react"
import type { LocationData } from "@/hooks/use-geolocation"
import { searchLocation } from "@/hooks/use-geolocation"

interface HomeScreenProps {
  onNavigateSearch: (category?: string) => void
  location: LocationData | null
  locationLoading: boolean
  locationError: string | null
  onRefreshLocation: () => void
  onSetManualLocation: (city: string, address: string) => void
}

interface SearchResult {
  display_name: string
  city: string
  country: string
  lat: string
  lon: string
}

const categories = [
  { name: "Burgers", image: "/images/burger.jpg", color: "bg-amber-500" },
  { name: "Pizza", image: "/images/pizza.jpg", color: "bg-amber-500" },
  { name: "Burrito", image: "/images/burrito.jpg", color: "bg-amber-500" },
]

export function HomeScreen({
  onNavigateSearch,
  location,
  locationLoading,
  locationError,
  onRefreshLocation,
  onSetManualLocation,
}: HomeScreenProps) {
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [recentLocations, setRecentLocations] = useState<
    Array<{ city: string; address: string }>
  >([])

  const displayLocation = locationLoading
    ? "Getting location..."
    : location
      ? `${location.city}${location.country ? `, ${location.country}` : ""}`
      : locationError
        ? "Set your location"
        : "Set your location"

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const results = await searchLocation(query)
    setSearchResults(results)
    setSearching(false)
  }, [])

  // Debounce the search
  useEffect(() => {
    if (searchQuery.trim().length < 2) return
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  const handleSelectResult = (result: SearchResult) => {
    const city = result.city || result.display_name.split(",")[0]
    const address = result.display_name
    onSetManualLocation(city, address)

    // Save to recents
    setRecentLocations((prev) => {
      const filtered = prev.filter((l) => l.address !== address)
      return [{ city, address }, ...filtered].slice(0, 3)
    })

    setShowLocationModal(false)
    setSearchQuery("")
    setSearchResults([])
  }

  const handleUseGPS = () => {
    onRefreshLocation()
    setShowLocationModal(false)
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div className="flex flex-col pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-5 md:px-8 pt-4 md:pt-6 pb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
            <MapPin size={10} />
            Deliver to
          </p>
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1 text-sm md:text-base font-semibold text-foreground max-w-full"
          >
            <span className="truncate">{displayLocation}</span>
            {locationLoading ? (
              <Loader2 size={14} className="animate-spin flex-shrink-0" />
            ) : (
              <ChevronDown size={14} className="flex-shrink-0" />
            )}
          </button>
          {location?.address && !locationLoading && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5 max-w-[250px]">
              {location.address}
            </p>
          )}
          {!location && locationError && !locationLoading && (
            <p className="text-[10px] text-destructive truncate mt-0.5">
              {locationError}
            </p>
          )}
        </div>
        <button
          type="button"
          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary flex items-center justify-center relative flex-shrink-0"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-foreground" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </header>

      {/* Promo Banner */}
      <div className="px-5 md:px-8 mt-3 md:mt-5">
        <div className="relative rounded-2xl overflow-hidden bg-primary h-44 md:h-56 lg:h-64">
          <Image
            src="/images/summer-combo.jpg"
            alt="Summer Combo Deal"
            fill
            className="object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/70 to-transparent h-1/2 z-10" />
          <div className="relative z-20 flex flex-col justify-end h-full p-5">
            <p className="text-card text-xs font-semibold uppercase tracking-wider">
              Summer Combo
            </p>
            <p className="text-card text-3xl font-bold mt-1">
              $10.88
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="mt-6 px-5">
        <div className="flex flex-col gap-4">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => onNavigateSearch(category.name)}
              className="relative rounded-2xl overflow-hidden h-28 group"
            >
              <Image
                src={category.image || "/placeholder.svg"}
                alt={category.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent z-10" />
              <div className="relative z-20 flex items-center justify-center h-full">
                <h3 className="text-2xl font-bold text-card uppercase tracking-wide drop-shadow-lg">
                  {category.name}
                </h3>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end max-w-md mx-auto">
          <div className="bg-card w-full rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-3 flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">
                Delivery Location
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowLocationModal(false)
                  setSearchQuery("")
                  setSearchResults([])
                }}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5 bg-secondary rounded-xl px-3.5 py-3">
                <Search size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for area, street name..."
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
                      setSearchResults([])
                    }}
                    aria-label="Clear search"
                  >
                    <X size={14} className="text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-5 pb-6 no-scrollbar">
              {/* Use GPS Button */}
              <button
                type="button"
                onClick={handleUseGPS}
                disabled={locationLoading}
                className="w-full flex items-center gap-3 py-3 border-b border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Navigation size={18} className="text-primary" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">
                    {locationLoading
                      ? "Getting your location..."
                      : "Use current location"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Enable GPS for automatic delivery location
                  </p>
                </div>
                {locationLoading && (
                  <Loader2
                    size={16}
                    className="animate-spin text-primary flex-shrink-0"
                  />
                )}
              </button>

              {/* Current Location Display */}
              {location && !searchQuery && (
                <div className="mt-3 mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Current Location
                  </p>
                  <div className="flex items-start gap-3 bg-primary/5 rounded-xl p-3.5 border border-primary/20">
                    <MapPin
                      size={16}
                      className="text-primary mt-0.5 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {location.city}
                        {location.country ? `, ${location.country}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {location.address}
                      </p>
                      {location.isManual && (
                        <span className="text-[9px] text-primary font-medium mt-1 inline-block">
                          Manually set
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Locations */}
              {!searchQuery && recentLocations.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Recent
                  </p>
                  <div className="flex flex-col">
                    {recentLocations.map((loc) => (
                      <button
                        type="button"
                        key={loc.address}
                        onClick={() =>
                          handleSelectResult({
                            display_name: loc.address,
                            city: loc.city,
                            country: "",
                            lat: "0",
                            lon: "0",
                          })
                        }
                        className="flex items-start gap-3 py-3 border-b border-border last:border-0 text-left"
                      >
                        <Clock
                          size={14}
                          className="text-muted-foreground mt-1 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {loc.city}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {loc.address}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    size={20}
                    className="animate-spin text-primary"
                  />
                  <span className="text-sm text-muted-foreground ml-2">
                    Searching...
                  </span>
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Search Results
                  </p>
                  <div className="flex flex-col">
                    {searchResults.map((result, i) => (
                      <button
                        type="button"
                        key={`${result.lat}-${result.lon}-${i}`}
                        onClick={() => handleSelectResult(result)}
                        className="flex items-start gap-3 py-3 border-b border-border last:border-0 text-left"
                      >
                        <MapPin
                          size={14}
                          className="text-primary mt-1 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {result.city || result.display_name.split(",")[0]}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {result.display_name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!searching &&
                searchQuery.length >= 2 &&
                searchResults.length === 0 && (
                  <div className="flex flex-col items-center py-8">
                    <MapPin
                      size={32}
                      className="text-muted-foreground/30 mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      No locations found
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Try a different search term
                    </p>
                  </div>
                )}

              {/* Enter Manually Hint */}
              {!searchQuery && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Type an address above to search, or use GPS to detect your
                    location automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
