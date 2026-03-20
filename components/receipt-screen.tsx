"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
} from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { cancelOrder, getOrderReceipt } from "@/app/actions/orders"

interface OrderItem {
  id: string
  food_name: string
  food_price: number
  quantity: number
  selected_toppings: string[]
  selected_sides: string[]
}

interface Transaction {
  id: string
  mpesa_receipt_number: string
  mpesa_transaction_date: string
  phone_number: string
  amount: number
  status: string
  result_desc: string
  created_at: string
}

interface Order {
  id: string
  status: string
  total: number
  delivery_fee: number
  discount: number
  delivery_address: string
  mpesa_number: string
  mpesa_transaction_id: string
  payment_status: string
  receipt_number: string
  created_at: string
  updated_at: string
  order_items: OrderItem[]
  transactions: Transaction[]
}

interface Profile {
  full_name: string
  email: string
  phone: string
}

interface ReceiptScreenProps {
  orderId: string
  onBack: () => void
}

export function ReceiptScreen({ orderId, onBack }: ReceiptScreenProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg(null)
      const result = await getOrderReceipt(orderId)
      if (result.data) {
        setOrder(result.data as unknown as Order)
      }
      if (result.profile) {
        setProfile(result.profile as unknown as Profile)
      }
      setLoading(false)
    }
    load()
  }, [orderId])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDownload = () => {
    if (!receiptRef.current || !order) return

    const transaction = order.transactions?.[0]
    const receiptCode =
      transaction?.mpesa_receipt_number ||
      order.mpesa_transaction_id ||
      order.receipt_number ||
      order.id.slice(0, 8)

    const content = generateTextReceipt(order, profile)
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `receipt-${receiptCode}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (!order) return

    const content = generateTextReceipt(order, profile)
    const transaction = order.transactions?.[0]
    const receiptCode =
      transaction?.mpesa_receipt_number ||
      order.mpesa_transaction_id ||
      order.receipt_number ||
      order.id.slice(0, 8)

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receiptCode}`,
          text: content,
        })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(content)
      alert("Receipt copied to clipboard")
    }
  }

  const handleCancel = async () => {
    if (!order) return
    if (!confirm("Cancel this pending order?")) return
    setCancelling(true)
    setErrorMsg(null)
    const result = await cancelOrder(order.id)
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      const updated = await getOrderReceipt(order.id)
      if (updated.data) {
        setOrder(updated.data as unknown as Order)
      }
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20">
        <LoadingSpinner size="lg" label="Loading receipt" sublabel="Fetching payment details" variant="inline" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-5">
        <XCircle size={48} className="text-destructive mb-4" />
        <h3 className="text-lg font-bold text-foreground">
          Receipt not found
        </h3>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    )
  }

  const transaction = order.transactions?.[0]
  const receiptCode =
    transaction?.mpesa_receipt_number ||
    order.mpesa_transaction_id ||
    order.receipt_number ||
    order.id.slice(0, 12).toUpperCase()
  const isPaid = order.payment_status === "completed"
  const canCancel =
    order.status === "pending" && order.payment_status === "pending"
  const totalKSh = Math.ceil(Number(order.total))
  const subtotalKSh = order.order_items.reduce(
    (sum, item) => sum + Math.ceil(Number(item.food_price) * item.quantity),
    0
  )
  const discountKSh = Math.ceil(Number(order.discount))
  const deliveryKSh = Math.ceil(Number(order.delivery_fee))

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
        <h1 className="text-lg font-bold text-foreground">Receipt</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Share receipt"
          >
            <Share2 size={18} className="text-foreground" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Download receipt"
          >
            <Download size={18} className="text-foreground" />
          </button>
        </div>
      </header>

      {/* Receipt Card */}
      <div className="px-5 mt-4" ref={receiptRef}>
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Status Banner */}
          <div
            className={`px-5 py-4 flex items-center gap-3 ${
              isPaid
                ? "bg-green-50"
                : order.status === "cancelled"
                  ? "bg-red-50"
                  : "bg-amber-50"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 size={24} className="text-green-600" />
            ) : order.status === "cancelled" ? (
              <XCircle size={24} className="text-destructive" />
            ) : (
              <Clock size={24} className="text-amber-500" />
            )}
            <div>
              <h2
                className={`text-sm font-bold ${
                  isPaid
                    ? "text-green-700"
                    : order.status === "cancelled"
                      ? "text-red-700"
                      : "text-amber-700"
                }`}
              >
                {isPaid
                  ? "Payment Successful"
                  : order.status === "cancelled"
                    ? "Payment Failed"
                    : "Payment Pending"}
              </h2>
              <p
                className={`text-xs ${
                  isPaid
                    ? "text-green-600"
                    : order.status === "cancelled"
                      ? "text-red-600"
                      : "text-amber-600"
                }`}
              >
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          {/* Receipt Info */}
          <div className="p-5">
            {/* Receipt Number + Logo */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Receipt No.
                </p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {receiptCode}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Receipt size={16} className="text-primary-foreground" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  FoodGo
                </span>
              </div>
            </div>

            {/* Customer Info */}
            {profile && (
              <div className="mb-5 pb-4 border-b border-dashed border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Customer
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {profile.full_name || "Customer"}
                </p>
                {profile.email && (
                  <p className="text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="mb-5 pb-4 border-b border-dashed border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                Order Items
              </p>
              <div className="flex flex-col gap-2.5">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {item.food_name}{" "}
                        <span className="text-muted-foreground">
                          x{item.quantity}
                        </span>
                      </p>
                      {item.selected_toppings.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Toppings: {item.selected_toppings.join(", ")}
                        </p>
                      )}
                      {item.selected_sides.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Sides: {item.selected_sides.join(", ")}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground ml-4">
                      KSh{" "}
                      {Math.ceil(
                        Number(item.food_price) * item.quantity
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="mb-5 pb-4 border-b border-dashed border-border">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    Subtotal
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    KSh {subtotalKSh}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    Delivery Fee
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {deliveryKSh > 0 ? `KSh ${deliveryKSh}` : "Free"}
                  </span>
                </div>
                {discountKSh > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Discount
                    </span>
                    <span className="text-xs font-semibold text-green-600">
                      -KSh {discountKSh}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-1 border-t border-border">
                  <span className="text-sm font-bold text-foreground">
                    Total
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    KSh {totalKSh}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-5 pb-4 border-b border-dashed border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                Payment Details
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <CreditCard
                    size={14}
                    className="text-muted-foreground flex-shrink-0"
                  />
                  <div className="flex justify-between flex-1">
                    <span className="text-xs text-muted-foreground">
                      Method
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      M-Pesa (Lipa na M-Pesa)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone
                    size={14}
                    className="text-muted-foreground flex-shrink-0"
                  />
                  <div className="flex justify-between flex-1">
                    <span className="text-xs text-muted-foreground">
                      Phone
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {transaction?.phone_number || order.mpesa_number || "N/A"}
                    </span>
                  </div>
                </div>
                {(transaction?.mpesa_receipt_number ||
                  order.mpesa_transaction_id) && (
                  <div className="flex items-center gap-3">
                    <Receipt
                      size={14}
                      className="text-muted-foreground flex-shrink-0"
                    />
                    <div className="flex justify-between flex-1">
                      <span className="text-xs text-muted-foreground">
                        M-Pesa Ref
                      </span>
                      <span className="text-xs font-bold text-primary">
                        {transaction?.mpesa_receipt_number ||
                          order.mpesa_transaction_id}
                      </span>
                    </div>
                  </div>
                )}
                {transaction?.mpesa_transaction_date && (
                  <div className="flex items-center gap-3">
                    <Calendar
                      size={14}
                      className="text-muted-foreground flex-shrink-0"
                    />
                    <div className="flex justify-between flex-1">
                      <span className="text-xs text-muted-foreground">
                        Transaction Date
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {transaction.mpesa_transaction_date}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            {order.delivery_address && (
              <div className="mb-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Delivered To
                </p>
                <div className="flex items-start gap-2">
                  <MapPin
                    size={14}
                    className="text-primary mt-0.5 flex-shrink-0"
                  />
                  <p className="text-xs text-foreground">
                    {order.delivery_address}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-4 border-t border-dashed border-border">
              <p className="text-xs text-muted-foreground">
                Thank you for ordering with FoodGo
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                For support, contact us at support@foodgo.app
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {errorMsg && (
        <div className="px-5 mt-4">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMsg}
          </div>
        </div>
      )}
      <div className="px-5 mt-6 flex gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 border border-border text-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-transparent"
        >
          <Share2 size={16} />
          Share
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Download size={16} />
          Download
        </button>
      </div>
      {canCancel && (
        <div className="px-5 mt-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full border border-border text-foreground py-3 rounded-xl font-semibold text-sm bg-transparent hover:bg-secondary transition-colors disabled:opacity-60"
          >
            {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        </div>
      )}
    </div>
  )
}

function generateTextReceipt(
  order: Order,
  profile: Profile | null
): string {
  const totalKSh = Math.ceil(Number(order.total))
  const transaction = order.transactions?.[0]
  const receiptCode =
    transaction?.mpesa_receipt_number ||
    order.mpesa_transaction_id ||
    order.receipt_number ||
    order.id.slice(0, 12)
  const lines: string[] = []
  const w = 40

  lines.push("=".repeat(w))
  lines.push(centerText("FOODGO", w))
  lines.push(centerText("Food Delivery Receipt", w))
  lines.push("=".repeat(w))
  lines.push("")
  lines.push(`Receipt No:  ${receiptCode}`)
  lines.push(`Date:        ${new Date(order.created_at).toLocaleString("en-KE")}`)
  lines.push(`Status:      ${order.payment_status === "completed" ? "PAID" : order.status.toUpperCase()}`)
  if (profile?.full_name) {
    lines.push(`Customer:    ${profile.full_name}`)
  }
  lines.push("")
  lines.push("-".repeat(w))
  lines.push("ITEMS")
  lines.push("-".repeat(w))

  for (const item of order.order_items) {
    const itemTotal = Math.ceil(Number(item.food_price) * item.quantity)
    lines.push(`${item.food_name} x${item.quantity}`)
    lines.push(`${" ".repeat(28)}KSh ${itemTotal}`)
    if (item.selected_toppings.length > 0) {
      lines.push(`  Toppings: ${item.selected_toppings.join(", ")}`)
    }
    if (item.selected_sides.length > 0) {
      lines.push(`  Sides: ${item.selected_sides.join(", ")}`)
    }
  }

  lines.push("-".repeat(w))
  const discountKSh = Math.ceil(Number(order.discount))
  lines.push(padLine("Subtotal:", `KSh ${totalKSh + discountKSh}`, w))
  lines.push(padLine("Delivery:", "Free", w))
  if (discountKSh > 0) {
    lines.push(padLine("Discount:", `-KSh ${discountKSh}`, w))
  }
  lines.push("=".repeat(w))
  lines.push(padLine("TOTAL:", `KSh ${totalKSh}`, w))
  lines.push("=".repeat(w))
  lines.push("")
  lines.push("-".repeat(w))
  lines.push("PAYMENT DETAILS")
  lines.push("-".repeat(w))
  lines.push(padLine("Method:", "M-Pesa", w))
  lines.push(padLine("Phone:", transaction?.phone_number || order.mpesa_number || "N/A", w))
  if (transaction?.mpesa_receipt_number || order.mpesa_transaction_id) {
    lines.push(
      padLine("M-Pesa Ref:", transaction?.mpesa_receipt_number || order.mpesa_transaction_id, w)
    )
  }
  if (order.delivery_address) {
    lines.push("")
    lines.push(padLine("Delivered to:", order.delivery_address, w))
  }
  lines.push("")
  lines.push("=".repeat(w))
  lines.push(centerText("Thank you for ordering!", w))
  lines.push(centerText("support@foodgo.app", w))
  lines.push("=".repeat(w))

  return lines.join("\n")
}

function centerText(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return " ".repeat(pad) + text
}

function padLine(left: string, right: string, width: number): string {
  const spaces = Math.max(1, width - left.length - right.length)
  return left + " ".repeat(spaces) + right
}
