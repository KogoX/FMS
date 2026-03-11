"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface LocationData {
  latitude: number | null
  longitude: number | null
  address: string
  city: string
  country: string
  isManual: boolean
}

interface UseGeolocationReturn {
  location: LocationData | null
  loading: boolean
  error: string | null
  refresh: () => void
  setManualLocation: (city: string, address: string) => void
}

async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ address: string; city: string; country: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "FoodGoApp/1.0",
        },
      }
    )
    if (!res.ok) throw new Error("Geocoding failed")
    const data = await res.json()
    const addr = data.address || {}
    const road = addr.road || addr.pedestrian || addr.neighbourhood || ""
    const houseNumber = addr.house_number || ""
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      ""
    const country = addr.country || ""
    const street = houseNumber ? `${road} ${houseNumber}` : road
    const address = street ? `${street}, ${city}` : city

    return {
      address: address || data.display_name || "Unknown location",
      city: city || "Unknown",
      country,
    }
  } catch {
    return { address: "Unknown location", city: "Unknown", country: "" }
  }
}

export async function searchLocation(
  query: string
): Promise<Array<{ display_name: string; city: string; country: string; lat: string; lon: string }>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "FoodGoApp/1.0",
        },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.map((item: Record<string, unknown>) => {
      const addr = (item.address || {}) as Record<string, string>
      return {
        display_name: item.display_name as string,
        city:
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          "",
        country: addr.country || "",
        lat: item.lat as string,
        lon: item.lon as string,
      }
    })
  } catch {
    return []
  }
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  const fetchLocation = useCallback(() => {
    if (typeof window === "undefined") return

    if (!navigator.geolocation) {
      setError("Geolocation not supported. Enter your location manually.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // First try without high accuracy (faster, works in more environments)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const geo = await reverseGeocode(latitude, longitude)
          setLocation({
            latitude,
            longitude,
            address: geo.address,
            city: geo.city,
            country: geo.country,
            isManual: false,
          })
        } catch {
          setLocation({
            latitude,
            longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city: "Your Location",
            country: "",
            isManual: false,
          })
        }
        setLoading(false)
      },
      (err) => {
        let message = "Unable to get your location"
        if (err.code === err.PERMISSION_DENIED) {
          message = "Location access denied. Enter your address manually."
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "Location unavailable. Enter your address manually."
        } else if (err.code === err.TIMEOUT) {
          message = "Location timed out. Enter your address manually."
        }
        setError(message)
        setLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 600000, // Cache for 10 minutes
      }
    )
  }, [])

  const setManualLocation = useCallback(
    (city: string, address: string) => {
      setLocation({
        latitude: null,
        longitude: null,
        address,
        city,
        country: "",
        isManual: true,
      })
      setError(null)
      setLoading(false)
    },
    []
  )

  // Auto-attempt geolocation once on mount
  useEffect(() => {
    if (!attemptedRef.current) {
      attemptedRef.current = true
      fetchLocation()
    }
  }, [fetchLocation])

  return {
    location,
    loading,
    error,
    refresh: fetchLocation,
    setManualLocation,
  }
}
