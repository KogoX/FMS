"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Receipt,
  LogOut,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
} from "lucide-react"
import { getAdminStats } from "@/app/actions/admin"
import { signOut } from "@/app/actions/auth"
import { AdminOverview } from "./admin-overview"
import { AdminOrders } from "./admin-orders"
import { AdminFood } from "./admin-food"
import { AdminTransactions } from "./admin-transactions"
import { LoadingSpinner } from "@/components/loading-spinner"

type Tab = "overview" | "orders" | "inshop" | "food" | "transactions"

interface Stats {
  totalEarnings: number
  todayEarnings: number
  weekEarnings: number
  monthEarnings: number
  totalOrders: number
  todayOrders: number
  weekOrders: number
  monthOrders: number
  pendingOrders: number
  totalUsers: number
  totalFoodItems: number
  chartData: Array<{ date: string; label: string; earnings: number }>
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadStats = useCallback(async () => {
    const result = await getAdminStats()
    if (result.data) {
      setStats(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const navItems = [
    { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
    { id: "orders" as Tab, label: "Orders", icon: ShoppingBag },
    { id: "inshop" as Tab, label: "In-Shop Orders", icon: ShoppingBag },
    { id: "food" as Tab, label: "Food Menu", icon: UtensilsCrossed },
    { id: "transactions" as Tab, label: "Transactions", icon: Receipt },
  ]

  const statCards = stats
    ? [
        {
          label: "Total Earnings",
          value: `KSh ${stats.totalEarnings.toLocaleString()}`,
          icon: DollarSign,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
        },
        {
          label: "Today's Sales",
          value: `KSh ${stats.todayEarnings.toLocaleString()}`,
          icon: TrendingUp,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
        },
        {
          label: "Pending Orders",
          value: stats.pendingOrders.toString(),
          icon: Clock,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
        },
        {
          label: "Total Users",
          value: stats.totalUsers.toString(),
          icon: Users,
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Food Grove Admin</h1>
            <p className="text-xs text-muted-foreground">Business Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to App
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-card border-b border-border px-4">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === item.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" label="Loading dashboard" variant="inline" />
          </div>
        ) : (
          <>
            {activeTab === "overview" && stats && (
              <AdminOverview stats={stats} statCards={statCards} onRefresh={loadStats} />
            )}
            {activeTab === "orders" && <AdminOrders />}
            {activeTab === "inshop" && <AdminOrders orderSource="inshop" />}
            {activeTab === "food" && <AdminFood />}
            {activeTab === "transactions" && <AdminTransactions />}
          </>
        )}
      </main>
    </div>
  )
}
