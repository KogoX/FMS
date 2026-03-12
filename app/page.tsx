"use client"

import { useState, useCallback, useEffect } from "react"
import { AuthScreen } from "@/components/auth-screen"
import { LoginSuccess } from "@/components/login-success"
import { HomeScreen } from "@/components/home-screen"
import { SearchScreen } from "@/components/search-screen"
import { ProductDetail } from "@/components/product-detail"
import { CartScreen } from "@/components/cart-screen"
import { ProfileScreen } from "@/components/profile-screen"
import { OrdersScreen } from "@/components/orders-screen"
import { ReceiptScreen } from "@/components/receipt-screen"
import { BottomNav, type Screen } from "@/components/bottom-nav"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useGeolocation } from "@/hooks/use-geolocation"
import type { FoodItem, CartItem, UserProfile } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { getProfile, updateProfile as updateProfileAction } from "@/app/actions/profile"
import { getFoodItems } from "@/app/actions/food"
import { signOut } from "@/app/actions/auth"
import { createPendingOrder } from "@/app/actions/orders"

type AppState = "loading" | "auth" | "login-success" | "app"

const defaultProfile: UserProfile = {
  fullName: "",
  email: "",
  phone: "",
  mpesaNumber: "",
  address: "",
}

export default function Page() {
  const [appState, setAppState] = useState<AppState>("loading")
  const [screen, setScreen] = useState<Screen>("home")
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null)
  const [searchCategory, setSearchCategory] = useState<string | undefined>()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [userId, setUserId] = useState<string | null>(null)
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [foodLoading, setFoodLoading] = useState(true)
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    location,
    loading: locationLoading,
    error: locationError,
    refresh: refreshLocation,
    setManualLocation,
  } = useGeolocation()

  const deliveryAddress = location
    ? location.address
    : profile.address || ""

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUserId(session.user.id)
        // Load profile from DB
        const profileResult = await getProfile()
        if (profileResult.data) {
          setProfile({
            fullName: profileResult.data.full_name || "",
            email: profileResult.data.email || session.user.email || "",
            phone: profileResult.data.phone || "",
            mpesaNumber: profileResult.data.mpesa_number || "",
            address: profileResult.data.address || "",
          })
        }
        setAppState("app")
      } else {
        setAppState("auth")
      }
    }
    checkSession()
  }, [])

  // Load food items when app is ready
  useEffect(() => {
    if (appState === "app") {
      const loadFood = async () => {
        setFoodLoading(true)
        const result = await getFoodItems()
        if (result.data) {
          setFoodItems(result.data as FoodItem[])
        }
        setFoodLoading(false)
      }
      loadFood()
    }
  }, [appState])

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setAppState("auth")
          setUserId(null)
          setProfile(defaultProfile)
          setCartItems([])
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = useCallback(async (user: { id: string; email: string; fullName: string }) => {
    setUserId(user.id)
    // Load profile from DB
    const profileResult = await getProfile()
    if (profileResult.data) {
      setProfile({
        fullName: profileResult.data.full_name || user.fullName,
        email: profileResult.data.email || user.email,
        phone: profileResult.data.phone || "",
        mpesaNumber: profileResult.data.mpesa_number || "",
        address: profileResult.data.address || "",
      })
    } else {
      setProfile({
        ...defaultProfile,
        fullName: user.fullName,
        email: user.email,
      })
    }
    setAppState("login-success")
  }, [])

  const handleContinue = useCallback(() => {
    setAppState("app")
  }, [])

  const handleNavigateSearch = useCallback((category?: string) => {
    setSearchCategory(category)
    setScreen("search")
  }, [])

  const handleSelectItem = useCallback((item: FoodItem) => {
    setSelectedItem(item)
    setScreen("product-detail")
  }, [])

  const handleAddToCartSimple = useCallback((item: FoodItem) => {
    setCartItems((prev) => {
      const existing = prev.findIndex((ci) => ci.food.id === item.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + 1,
        }
        return updated
      }
      return [
        ...prev,
        { food: item, quantity: 1, selectedToppings: [], selectedSides: [] },
      ]
    })
  }, [])

  const handleAddToCartDetail = useCallback(
    (item: FoodItem, quantity: number, toppings: string[], sides: string[]) => {
      setCartItems((prev) => [
        ...prev,
        {
          food: item,
          quantity,
          selectedToppings: toppings,
          selectedSides: sides,
        },
      ])
      setScreen("cart")
    },
    []
  )

  const handleUpdateQuantity = useCallback(
    (index: number, quantity: number) => {
      setCartItems((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], quantity }
        return updated
      })
    },
    []
  )

  const handleRemoveItem = useCallback((index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleNavigate = useCallback((s: Screen) => {
    setScreen(s)
    if (s !== "product-detail") {
      setSelectedItem(null)
    }
    if (s !== "receipt") {
      setReceiptOrderId(null)
    }
  }, [])

  const handleViewReceipt = useCallback((orderId: string) => {
    setReceiptOrderId(orderId)
    setScreen("receipt")
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
    setAppState("auth")
    setScreen("home")
    setCartItems([])
    setProfile(defaultProfile)
    setUserId(null)
  }, [])

  const handleUpdateProfile = useCallback(async (updated: UserProfile) => {
    setProfile(updated)
    // Persist to Supabase
    await updateProfileAction({
      full_name: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      mpesa_number: updated.mpesaNumber,
      address: updated.address,
    })
  }, [])

  const handlePlaceOrder = useCallback(async (mpesaNumber: string) => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.food.price * item.quantity,
      0
    )
    const discount = subtotal > 30 ? 1.45 : 0
    const total = subtotal - discount

    // Create a pending order in the DB (payment not yet confirmed)
    const result = await createPendingOrder({
      items: cartItems.map((ci) => ({
        food_item_id: ci.food.id,
        food_name: ci.food.name,
        food_price: ci.food.price,
        quantity: ci.quantity,
        selected_toppings: ci.selectedToppings,
        selected_sides: ci.selectedSides,
      })),
      total,
      delivery_fee: 0,
      discount,
      delivery_address: deliveryAddress,
      mpesa_number: mpesaNumber,
    })

    if (result.error) {
      return { error: result.error }
    }

    // Cart will be cleared after payment confirmation via finalizeOrder
    return { data: result.data }
  }, [cartItems, deliveryAddress])

  if (appState === "loading") {
    return (
      <main className="max-w-md md:max-w-lg lg:max-w-xl mx-auto min-h-screen bg-card shadow-xl flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading" sublabel="Preparing your experience" variant="inline" />
      </main>
    )
  }

  if (appState === "auth") {
    return (
      <main className="max-w-md md:max-w-lg lg:max-w-xl mx-auto min-h-screen bg-card shadow-xl">
        <AuthScreen onLogin={handleLogin} />
      </main>
    )
  }

  if (appState === "login-success") {
    return (
      <main className="max-w-md md:max-w-lg lg:max-w-xl mx-auto min-h-screen bg-card shadow-xl">
        <LoginSuccess onContinue={handleContinue} />
      </main>
    )
  }

  return (
    <main className="max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto min-h-screen bg-card shadow-xl relative">
      {screen === "home" && (
        <HomeScreen
          onNavigateSearch={handleNavigateSearch}
          onSelectItem={handleSelectItem}
          location={location}
          locationLoading={locationLoading}
          locationError={locationError}
          onRefreshLocation={refreshLocation}
          onSetManualLocation={setManualLocation}
          foodItems={foodItems}
          foodLoading={foodLoading}
        />
      )}

      {screen === "search" && (
        <SearchScreen
          initialCategory={searchCategory}
          onSelectItem={handleSelectItem}
          onAddToCart={handleAddToCartSimple}
          foodItems={foodItems}
          loading={foodLoading}
        />
      )}

      {screen === "product-detail" && selectedItem && (
        <ProductDetail
          item={selectedItem}
          onBack={() => setScreen("search")}
          onAddToCart={handleAddToCartDetail}
        />
      )}

      {screen === "cart" && (
        <CartScreen
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onBack={() => setScreen("home")}
          profile={profile}
          deliveryAddress={deliveryAddress}
          onNavigateProfile={() => setScreen("profile")}
          onPlaceOrder={handlePlaceOrder}
          onOrderComplete={() => setCartItems([])}
          onViewReceipt={handleViewReceipt}
        />
      )}

      {screen === "orders" && (
        <OrdersScreen
          onBack={() => setScreen("home")}
          onViewReceipt={handleViewReceipt}
        />
      )}

      {screen === "receipt" && receiptOrderId && (
        <ReceiptScreen
          orderId={receiptOrderId}
          onBack={() => setScreen("orders")}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          deliveryAddress={deliveryAddress}
          onBack={() => setScreen("home")}
          onLogout={handleLogout}
          onSetManualLocation={setManualLocation}
        />
      )}

      <BottomNav
        active={screen}
        onNavigate={handleNavigate}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
      />
    </main>
  )
}
