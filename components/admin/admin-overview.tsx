"use client"

import { RefreshCw, type LucideIcon } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

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

interface StatCard {
  label: string
  value: string
  icon: LucideIcon
  color: string
  bgColor: string
}

interface AdminOverviewProps {
  stats: Stats
  statCards: StatCard[]
  onRefresh: () => void
}

export function AdminOverview({ stats, statCards, onRefresh }: AdminOverviewProps) {
  // Get last 7 days for bar chart
  const weekData = stats.chartData.slice(-7)

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-xl border border-border p-4 lg:p-6"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon size={20} className={card.color} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                <p className="text-lg lg:text-xl font-bold text-foreground truncate">
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Earnings (Last 30 Days)</h3>
            <button
              onClick={onRefresh}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, "Earnings"]}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEarnings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Bar Chart */}
        <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
          <h3 className="font-semibold text-foreground mb-4">This Week</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, "Earnings"]}
                />
                <Bar
                  dataKey="earnings"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Orders Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Today</span>
              <span className="text-sm font-semibold text-foreground">{stats.todayOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">This Week</span>
              <span className="text-sm font-semibold text-foreground">{stats.weekOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="text-sm font-semibold text-foreground">{stats.monthOrders}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-sm font-bold text-primary">{stats.totalOrders}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Revenue Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Today</span>
              <span className="text-sm font-semibold text-foreground">
                KSh {stats.todayEarnings.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">This Week</span>
              <span className="text-sm font-semibold text-foreground">
                KSh {stats.weekEarnings.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="text-sm font-semibold text-foreground">
                KSh {stats.monthEarnings.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-sm font-bold text-emerald-500">
                KSh {stats.totalEarnings.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Stats</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="text-sm font-semibold text-foreground">{stats.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Menu Items</span>
              <span className="text-sm font-semibold text-foreground">{stats.totalFoodItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending Orders</span>
              <span className="text-sm font-semibold text-amber-500">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium text-foreground">Avg. Order</span>
              <span className="text-sm font-bold text-primary">
                KSh {stats.totalOrders > 0 ? Math.round(stats.totalEarnings / stats.totalOrders).toLocaleString() : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
