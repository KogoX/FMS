"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  CreditCard,
  RefreshCw,
  CheckCheck,
  Send,
  Banknote,
} from "lucide-react"
import {
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  verifyPayment,
  promptPayment,
  createInShopOrder,
} from "@/app/actions/admin"
import { LoadingSpinner } from "@/components/loading-spinner"

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
  status: string
  amount: number
  mpesa_receipt_number: string
  phone_number: string
}

interface Order {
  id: string
  ticket_number: string
  status: string
  payment_status: string
  total: number
  delivery_address: string
  mpesa_number: string
  mpesa_transaction_id: string
  created_at: string
  order_items: OrderItem[]
  transactions: Transaction[]
  profiles: {
    full_name: string
    email: string
    phone: string
  }
}

type FilterType = "all" | "pending" | "completed" | "cancelled"
type OrderSource = "all" | "inshop"

export function AdminOrders({ orderSource = "all" }: { orderSource?: OrderSource }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [search, setSearch] = useState("")
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [promptingId, setPromptingId] = useState<string | null>(null)
  const [promptPhones, setPromptPhones] = useState<Record<string, string>>({})
  const [promptMessages, setPromptMessages] = useState<Record<string, string>>({})
  const [promptFeedback, setPromptFeedback] = useState<{
    orderId: string
    type: "success" | "error"
    message: string
  } | null>(null)
  const [inshopPhone, setInshopPhone] = useState("")
  const [inshopAmount, setInshopAmount] = useState("")
  const [inshopMessage, setInshopMessage] = useState("")
  const [inshopSubmitting, setInshopSubmitting] = useState(false)
  const [inshopFeedback, setInshopFeedback] = useState<string | null>(null)
  const [watchOrderId, setWatchOrderId] = useState<string | null>(null)
  const [paymentModal, setPaymentModal] = useState<{
    status: "waiting" | "completed" | "cancelled" | "failed"
    message: string
  } | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const result = await getAdminOrders(filter)
    if (result.data) {
      setOrders(result.data)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase()
    return (
      order.ticket_number?.toLowerCase().includes(searchLower) ||
      order.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      order.profiles?.email?.toLowerCase().includes(searchLower) ||
      order.mpesa_number?.includes(search)
    )
  })

  const sourceFilteredOrders = filteredOrders.filter((order) => {
    if (orderSource === "inshop") {
      return order.ticket_number?.startsWith("POS-")
    }
    return true
  })

  const handleVerifyPayment = async (orderId: string, transactionId?: string) => {
    setProcessingId(orderId)
    await verifyPayment(orderId, transactionId)
    await loadOrders()
    setProcessingId(null)
  }

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setProcessingId(orderId)
    await updateOrderStatus(orderId, status)
    await loadOrders()
    setProcessingId(null)
  }

  const handleCreateInShop = async (mode: "stk" | "cash") => {
    setInshopSubmitting(true)
    setInshopFeedback(null)
    const amount = Number(inshopAmount)
    const phone = inshopPhone.trim()
    const message = inshopMessage.trim()

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setInshopFeedback("Enter a valid amount.")
      setInshopSubmitting(false)
      return
    }
    if (mode === "stk" && !phone) {
      setInshopFeedback("Enter a valid M-Pesa phone number for STK prompt.")
      setInshopSubmitting(false)
      return
    }

    const result = await createInShopOrder({
      amount,
      phoneNumber: phone,
      message,
      promptPayment: mode === "stk",
      cashPaid: mode === "cash",
    })

    if (result?.error) {
      setInshopFeedback(result.error)
    } else {
      setInshopFeedback("In-shop order created.")
      setInshopPhone("")
      setInshopAmount("")
      setInshopMessage("")
      await loadOrders()
      if (mode === "stk" && result?.data?.orderId) {
        setWatchOrderId(result.data.orderId)
        setPaymentModal({
          status: "waiting",
          message: "Waiting for customer payment confirmation...",
        })
      }
    }

    setInshopSubmitting(false)
  }

  const handlePromptPayment = async (orderId: string) => {
    setPromptingId(orderId)
    setPromptFeedback(null)
    const phone = (promptPhones[orderId] || "").trim()
    const message = (promptMessages[orderId] || "").trim()
    if (!phone) {
      setPromptFeedback({
        orderId,
        type: "error",
        message: "Enter a valid M-Pesa phone number first.",
      })
      setPromptingId(null)
      return
    }
    const result = await promptPayment(orderId, phone, message)
    if (result?.error) {
      setPromptFeedback({ orderId, type: "error", message: result.error })
    } else {
      setPromptFeedback({
        orderId,
        type: "success",
        message: "STK push sent to the customer.",
      })
      setWatchOrderId(orderId)
      setPaymentModal({
        status: "waiting",
        message: "Waiting for customer payment confirmation...",
      })
    }
    await loadOrders()
    setPromptingId(null)
  }

  useEffect(() => {
    if (!watchOrderId) return
    let active = true
    const poll = async () => {
      const result = await getAdminOrderById(watchOrderId)
      if (!active) return
      const order = result.data as Order | undefined
      if (!order) return
      if (order.payment_status === "completed") {
        setPaymentModal({
          status: "completed",
          message: "Payment successful.",
        })
        setWatchOrderId(null)
        return
      }
      if (order.payment_status === "failed" || order.status === "cancelled") {
        setPaymentModal({
          status: "cancelled",
          message: "Payment cancelled or failed.",
        })
        setWatchOrderId(null)
        return
      }
      setPaymentModal({
        status: "waiting",
        message: "Waiting for customer payment confirmation...",
      })
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [watchOrderId])

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return
    setProcessingId(orderId)
    await updateOrderStatus(orderId, "cancelled", "failed")
    await loadOrders()
    setProcessingId(null)
  }

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === "completed") {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-medium rounded-full">
          <CheckCircle2 size={12} />
          Paid
        </span>
      )
    }
    if (paymentStatus === "stk_pushed") {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full">
          <Clock size={12} />
          Prompted
        </span>
      )
    }
    if (status === "cancelled" || paymentStatus === "failed") {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded-full">
          <XCircle size={12} />
          Cancelled
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">
        <Clock size={12} />
        Pending
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading orders" variant="inline" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Orders</h3>
          <p className="text-sm text-muted-foreground">
            {sourceFilteredOrders.length} total orders
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by ticket, customer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "completed", "cancelled"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {orderSource === "inshop" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Create In-Shop Order
          </h4>
          <p className="text-[10px] text-muted-foreground mt-1">
            Record a walk-in order, prompt the customer via STK, or mark cash paid.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Amount (KSh)"
              value={inshopAmount}
              onChange={(e) => setInshopAmount(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="tel"
              placeholder="Customer M-Pesa Number"
              value={inshopPhone}
              onChange={(e) => setInshopPhone(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Message to record (e.g., In-shop order for table 3)"
            value={inshopMessage}
            onChange={(e) => setInshopMessage(e.target.value)}
            className="mt-3 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleCreateInShop("stk")}
              disabled={inshopSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send size={14} />
              {inshopSubmitting ? "Processing..." : "Create & Send STK"}
            </button>
            <button
              onClick={() => handleCreateInShop("cash")}
              disabled={inshopSubmitting}
              className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Banknote size={14} />
              Mark Cash Paid
            </button>
            {inshopFeedback && (
              <span className="text-xs text-muted-foreground">{inshopFeedback}</span>
            )}
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {sourceFilteredOrders.map((order) => (
          <div
            key={order.id}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            {/* Order Header */}
            <div
              className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() =>
                setExpandedOrder(expandedOrder === order.id ? null : order.id)
              }
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {order.ticket_number || "N/A"}
                      </span>
                      {order.ticket_number?.startsWith("POS-") ? (
                        <span className="text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                          In-Shop
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          App
                        </span>
                      )}
                      {getStatusBadge(order.status, order.payment_status)}
                    </div>
                    <p className="text-sm text-foreground truncate mt-1">
                      {order.profiles?.full_name || "Unknown Customer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      KSh {Number(order.total).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_items?.length || 0} items
                    </p>
                  </div>
                  {expandedOrder === order.id ? (
                    <ChevronUp size={20} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={20} className="text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedOrder === order.id && (
              <div className="border-t border-border p-4 space-y-4">
                {/* Customer Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Customer</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-foreground">{order.profiles?.full_name || "N/A"}</p>
                      <p className="text-muted-foreground">{order.profiles?.email || "N/A"}</p>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone size={12} />
                        {order.profiles?.phone || order.mpesa_number || "N/A"}
                      </div>
                      {order.delivery_address && (
                        <div className="flex items-start gap-1 text-muted-foreground">
                          <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{order.delivery_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Payment</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CreditCard size={12} />
                        M-Pesa: {order.mpesa_number || "N/A"}
                      </div>
                      <p className="text-muted-foreground">
                        Ref: {order.mpesa_transaction_id || "Pending"}
                      </p>
                      {order.transactions?.[0] && (
                        <p className="text-muted-foreground">
                          Receipt: {order.transactions[0].mpesa_receipt_number || "N/A"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Items</h4>
                  <div className="space-y-2">
                    {order.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.quantity}x {item.food_name}
                          </p>
                          {(item.selected_toppings?.length > 0 ||
                            item.selected_sides?.length > 0) && (
                            <p className="text-xs text-muted-foreground">
                              {[
                                ...item.selected_toppings,
                                ...item.selected_sides,
                              ].join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          KSh {(item.food_price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {orderSource === "inshop" &&
                  order.payment_status !== "completed" &&
                  order.status !== "cancelled" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <div className="w-full rounded-lg border border-border bg-secondary/40 p-3">
                        <p className="text-xs font-semibold text-foreground">
                          Prompt Payment (In-Shop)
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Enter the customer phone number to send STK push, or mark as cash paid.
                        </p>
                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                          <input
                            type="tel"
                            placeholder="e.g. 2547XXXXXXXX"
                            value={promptPhones[order.id] ?? ""}
                            onChange={(e) =>
                              setPromptPhones((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <button
                            onClick={() => handlePromptPayment(order.id)}
                            disabled={promptingId === order.id}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            <Send size={14} />
                            {promptingId === order.id ? "Sending..." : "Send STK Push"}
                          </button>
                        </div>
                        <div className="mt-2">
                          <textarea
                            rows={2}
                            placeholder="Message to record (e.g., In-shop order for table 3)"
                            value={promptMessages[order.id] ?? ""}
                            onChange={(e) =>
                              setPromptMessages((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          />
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => handleVerifyPayment(order.id, "CASH")}
                            disabled={processingId === order.id}
                            className="flex items-center gap-2 px-3 py-2 border border-border text-foreground rounded-lg text-xs font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
                          >
                            <Banknote size={14} />
                            Mark Paid (Cash)
                          </button>
                        </div>
                        {promptFeedback?.orderId === order.id && (
                          <div
                            className={`mt-2 text-xs ${
                              promptFeedback.type === "error"
                                ? "text-destructive"
                                : "text-emerald-600"
                            }`}
                          >
                            {promptFeedback.message}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleVerifyPayment(order.id)}
                        disabled={processingId === order.id}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        <CheckCheck size={16} />
                        {processingId === order.id ? "Processing..." : "Verify Payment"}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, "preparing")}
                        disabled={processingId === order.id}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        Mark Preparing
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={processingId === order.id}
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>

      {sourceFilteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No orders found</p>
        </div>
      )}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-lg">
            <h4 className="text-base font-semibold text-foreground">
              Payment Status
            </h4>
            <p
              className={`text-sm mt-2 ${
                paymentModal.status === "completed"
                  ? "text-emerald-600"
                  : paymentModal.status === "cancelled"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {paymentModal.message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
