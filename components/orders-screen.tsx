"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  ArrowLeft,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Receipt,
  Package,
} from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { getOrders } from "@/app/actions/orders"

interface OrderItem {
  id: string
  food_name: string
  food_price: number
  quantity: number
  selected_toppings: string[]
  selected_sides: string[]
  food_item_id: string
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

interface OrdersScreenProps {
  onBack: () => void
  onViewReceipt: (orderId: string) => void
}

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  confirmed: { icon: CheckCircle2, color: "text-green-600", label: "Confirmed" },
  completed: { icon: CheckCircle2, color: "text-green-600", label: "Completed" },
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  cancelled: { icon: XCircle, color: "text-destructive", label: "Cancelled" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
}

export function OrdersScreen({ onBack, onViewReceipt }: OrdersScreenProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      const result = await getOrders()
      setOrders((result.data as Order[]) || [])
      setLoading(false)
    }
    loadOrders()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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
        <h1 className="text-lg font-bold text-foreground">My Orders</h1>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Search orders"
        >
          <Search size={20} className="text-foreground" />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-16">
          <LoadingSpinner size="md" label="Loading orders" sublabel="Fetching your order history" variant="inline" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 px-5 mt-16">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Package size={36} className="text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No orders yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your order history will appear here
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-5 mt-4">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending
            const StatusIcon = config.icon
            const itemCount = order.order_items.reduce(
              (sum, item) => sum + item.quantity,
              0
            )
            const totalKSh = Math.ceil(Number(order.total))
            const transaction = order.transactions?.[0]

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => onViewReceipt(order.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onViewReceipt(order.id)
                  }
                }}
                className="bg-secondary/30 border border-border rounded-2xl p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                {/* Top: receipt number + status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} className="text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      {order.receipt_number || order.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 ${config.color}`}>
                    <StatusIcon size={14} />
                    <span className="text-xs font-semibold">{config.label}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex -space-x-2">
                    {order.order_items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="w-10 h-10 rounded-lg overflow-hidden border-2 border-card bg-secondary relative flex-shrink-0"
                      >
                        <Image
                          src={`/images/${item.food_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.jpg`}
                          alt={item.food_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {order.order_items.length > 3 && (
                      <div className="w-10 h-10 rounded-lg border-2 border-card bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          +{order.order_items.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 ml-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {order.order_items
                        .map((i) => i.food_name)
                        .join(", ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {itemCount} item{itemCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Bottom: date, amount, and arrow */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                    {transaction?.mpesa_receipt_number && (
                      <p className="text-[10px] text-muted-foreground">
                        M-Pesa: {transaction.mpesa_receipt_number}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      KSh {totalKSh}
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
