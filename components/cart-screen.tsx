"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
  ArrowLeft,
  Search,
  Minus,
  Plus,
  Trash2,
  Smartphone,
  Check,
  Loader2,
  MapPin,
  X,
  AlertCircle,
  Phone,
} from "lucide-react"
import type { CartItem, UserProfile } from "@/lib/store"
import { finalizeOrder } from "@/app/actions/orders"

interface CartScreenProps {
  cartItems: CartItem[]
  onUpdateQuantity: (index: number, quantity: number) => void
  onRemoveItem: (index: number) => void
  onBack: () => void
  profile: UserProfile
  deliveryAddress: string
  onNavigateProfile: () => void
  onPlaceOrder: (mpesaNumber: string) => Promise<{
    error?: string
    data?: { orderId: string }
  }>
  onOrderComplete?: () => void
  onViewReceipt?: (orderId: string) => void
}

type PaymentState =
  | "idle"
  | "creating_order"
  | "stk_pushing"
  | "waiting_confirmation"
  | "success"
  | "failed"
  | "cancelled"

export function CartScreen({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onBack,
  profile,
  deliveryAddress,
  onNavigateProfile,
  onPlaceOrder,
  onOrderComplete,
  onViewReceipt,
}: CartScreenProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>("idle")
  const [showPaymentSheet, setShowPaymentSheet] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [customerMessage, setCustomerMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollCountRef = useRef(0)

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.food.price * item.quantity,
    0
  )
  const discount = subtotal > 30 ? 1.45 : 0
  const deliveryFee = 0
  const total = subtotal - discount + deliveryFee
  const totalKSh = Math.ceil(total * 130)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    pollCountRef.current = 0
  }, [])

  const pollPaymentStatus = useCallback(
    (checkoutId: string, orderIdForPoll: string) => {
      pollCountRef.current = 0

      pollIntervalRef.current = setInterval(async () => {
        pollCountRef.current += 1

        // Stop after 60 polls (2 minutes at 2s intervals)
        if (pollCountRef.current > 60) {
          stopPolling()
          setPaymentState("failed")
          setErrorMessage(
            "Payment confirmation timed out. Check your M-Pesa messages and contact support if debited."
          )
          return
        }

        try {
          const res = await fetch("/api/mpesa/query", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              checkoutRequestId: checkoutId,
              orderId: orderIdForPoll,
            }),
          })

          if (!res.ok) return

          const data = await res.json()

        if (data.status === "completed") {
          stopPolling()
          setTransactionId(data.transactionId || checkoutId)
          setPaymentState("success")
          // Clear cart in DB and notify parent
          if (orderIdForPoll) {
            finalizeOrder(orderIdForPoll)
          }
          onOrderComplete?.()
        } else if (data.status === "cancelled") {
          stopPolling()
          setPaymentState("cancelled")
          setErrorMessage(
            data.message || "Payment was cancelled on your phone."
          )
        } else if (data.status === "failed") {
          stopPolling()
          setPaymentState("failed")
          setErrorMessage(data.message || "Payment failed or was cancelled.")
        }
          // "pending" -> continue polling
        } catch {
          // Network error, keep polling
        }
      }, 2000)
    },
    [stopPolling]
  )

  const handleOrderNow = () => {
    if (!profile.mpesaNumber) {
      setShowPaymentSheet(true)
      return
    }
    processPayment()
  }

  const processPayment = async () => {
    setShowPaymentSheet(false)
    setPaymentState("creating_order")
    setErrorMessage(null)
    setCustomerMessage(null)

    try {
      // Step 1: Create pending order in DB
      const orderResult = await onPlaceOrder(profile.mpesaNumber)

      if (orderResult.error) {
        setErrorMessage(orderResult.error)
        setPaymentState("failed")
        return
      }

      const newOrderId = orderResult.data?.orderId
      if (!newOrderId) {
        setErrorMessage("Failed to create order")
        setPaymentState("failed")
        return
      }
      setOrderId(newOrderId)

      // Step 2: Trigger STK Push
      setPaymentState("stk_pushing")

      const stkRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: profile.mpesaNumber,
          orderId: newOrderId,
        }),
      })

      const stkData = await stkRes.json()

      if (!stkRes.ok || stkData.error) {
        setErrorMessage(stkData.error || "Failed to initiate M-Pesa payment")
        setPaymentState("failed")
        return
      }

      // STK Push sent successfully
      setCheckoutRequestId(stkData.checkoutRequestId)
      setCustomerMessage(
        stkData.customerMessage || "Check your phone for the M-Pesa prompt"
      )
      setPaymentState("waiting_confirmation")

      // Step 3: Start polling for payment status
      pollPaymentStatus(stkData.checkoutRequestId, newOrderId)
    } catch {
      setErrorMessage("Something went wrong. Please try again.")
      setPaymentState("failed")
    }
  }

  const handleRetry = () => {
    setPaymentState("idle")
    setErrorMessage(null)
    setOrderId(null)
    setCheckoutRequestId(null)
    setTransactionId(null)
    setCustomerMessage(null)
    stopPolling()
  }

  const isProcessing =
    paymentState === "creating_order" ||
    paymentState === "stk_pushing" ||
    paymentState === "waiting_confirmation"

  return (
    <div className="flex flex-col pb-20 bg-card min-h-screen">
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
        <h1 className="text-lg font-bold text-foreground">Cart</h1>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Search"
        >
          <Search size={20} className="text-foreground" />
        </button>
      </header>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 px-5 mt-16">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Trash2 size={36} className="text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {paymentState === "success"
              ? "Order placed!"
              : "Your cart is empty"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {paymentState === "success"
              ? "Your food is on its way"
              : "Add some items to get started"}
          </p>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="flex flex-col gap-3 px-5 mt-4">
            {cartItems.map((item, index) => (
              <div
                key={`${item.food.id}-${index}`}
                className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0 relative">
                  <Image
                    src={item.food.image || "/placeholder.svg"}
                    alt={item.food.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {item.food.name}
                  </h4>
                  <p className="text-sm font-bold text-primary mt-0.5">
                    KSh {(item.food.price * item.quantity * 130).toFixed(0)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.quantity <= 1) {
                        onRemoveItem(index)
                      } else {
                        onUpdateQuantity(index, item.quantity - 1)
                      }
                    }}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold text-foreground w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground"
                    aria-label="Increase quantity"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Address */}
          <div className="px-5 mt-6">
            <h3 className="text-sm font-bold text-foreground mb-3">
              Delivery Address
            </h3>
            <div className="flex items-start gap-3 bg-secondary/50 rounded-xl p-3.5">
              <MapPin
                size={16}
                className="text-primary mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {deliveryAddress || "Location not set"}
                </p>
                {!deliveryAddress && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Enable location services for delivery
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="px-5 mt-6">
            <h3 className="text-sm font-bold text-foreground mb-3">
              Payment Method
            </h3>
            <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#4CAF50] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-card">M</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  M-Pesa (Lipa na M-Pesa)
                </p>
                {profile.mpesaNumber ? (
                  <p className="text-[10px] text-muted-foreground">
                    STK Push to {profile.mpesaNumber}
                  </p>
                ) : (
                  <p className="text-[10px] text-destructive">
                    No M-Pesa number set
                  </p>
                )}
              </div>
              {!profile.mpesaNumber && (
                <button
                  type="button"
                  onClick={onNavigateProfile}
                  className="text-primary text-xs font-semibold"
                >
                  Set up
                </button>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="px-5 mt-6">
            <h3 className="text-sm font-bold text-foreground mb-3">
              Payment Summary
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Total Items ({cartItems.length})
                </span>
                <span className="text-xs font-semibold text-foreground">
                  KSh {(subtotal * 130).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Delivery Fee
                </span>
                <span className="text-xs font-semibold text-foreground">
                  Free
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    Discount
                  </span>
                  <span className="text-xs font-semibold text-green-600">
                    -KSh {(discount * 130).toFixed(0)}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-2 mt-1 flex justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-sm font-bold text-foreground">
                  KSh {totalKSh}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
        {errorMessage &&
          (paymentState === "failed" || paymentState === "cancelled") && (
          <div className="mx-5 mt-4 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle
              size={16}
              className="text-destructive mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {paymentState === "cancelled"
                  ? "Payment Cancelled"
                  : "Payment Failed"}
              </p>
              <p className="text-xs text-destructive/80 mt-0.5">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

          {/* Order Now / Retry Button */}
          <div className="px-5 mt-6">
          {paymentState === "failed" || paymentState === "cancelled" ? (
            <button
              type="button"
              onClick={handleRetry}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Smartphone size={16} />
              Try Again
            </button>
          ) : (
              <button
                type="button"
                onClick={handleOrderNow}
                disabled={isProcessing}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {paymentState === "creating_order" && "Creating order..."}
                    {paymentState === "stk_pushing" &&
                      "Sending to your phone..."}
                    {paymentState === "waiting_confirmation" &&
                      "Waiting for M-Pesa PIN..."}
                  </>
                ) : (
                  <>
                    <Smartphone size={16} />
                    Pay with M-Pesa - KSh {totalKSh}
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}

      {/* M-Pesa Not Set Up Sheet */}
      {showPaymentSheet && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" />
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <Smartphone size={28} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Set Up M-Pesa
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your M-Pesa number in Profile to receive the payment prompt
                on your phone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentSheet(false)}
                className="flex-1 border border-border text-foreground py-3 rounded-xl font-semibold text-sm bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentSheet(false)
                  onNavigateProfile()
                }}
                className="flex-1 bg-[#4CAF50] text-card py-3 rounded-xl font-semibold text-sm"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STK Push Waiting Overlay */}
      {paymentState === "waiting_confirmation" && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
          <div className="bg-card rounded-3xl p-8 mx-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 rounded-full border-2 border-[#4CAF50]/30 border-t-[#4CAF50] animate-spin" />
              <Phone size={28} className="text-[#4CAF50]" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Check Your Phone
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {customerMessage ||
                "An M-Pesa payment prompt has been sent to your phone. Enter your M-Pesa PIN to complete the payment."}
            </p>
            <div className="mt-4 bg-secondary/50 rounded-xl p-3 w-full">
              <div className="flex items-center gap-2 justify-center">
                <div className="w-8 h-8 rounded-lg bg-[#4CAF50] flex items-center justify-center">
                  <span className="text-xs font-bold text-card">M</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">
                    KSh {totalKSh}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    to {profile.mpesaNumber}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              <p className="text-xs">Waiting for confirmation...</p>
            </div>
            <button
              type="button"
              onClick={() => {
                stopPolling()
                setPaymentState("cancelled")
                setErrorMessage("Payment was cancelled.")
              }}
              className="mt-4 text-sm text-destructive font-medium hover:underline"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      )}

      {/* Payment Success Overlay */}
      {paymentState === "success" && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
          <div className="bg-card rounded-3xl p-8 mx-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#4CAF50] flex items-center justify-center">
                <Check size={28} className="text-card" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Payment Successful
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your M-Pesa payment of KSh {totalKSh} has been confirmed. Your
              order is being prepared!
            </p>
            <div className="mt-4 bg-secondary/50 rounded-xl p-3 w-full">
              <p className="text-[10px] text-muted-foreground">
                M-Pesa Confirmation
              </p>
              <p className="text-xs font-semibold text-foreground mt-0.5">
                Transaction: {transactionId || "Processing..."}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paid from: {profile.mpesaNumber}
              </p>
            </div>
            <div className="w-full mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  handleRetry()
                  onBack()
                }}
                className="flex-1 border border-border text-foreground py-3 rounded-xl font-semibold text-sm bg-transparent"
              >
                Home
              </button>
              {orderId && onViewReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    const savedOrderId = orderId
                    handleRetry()
                    onViewReceipt(savedOrderId)
                  }}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm"
                >
                  View Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
