"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  CreditCard,
} from "lucide-react"
import { getAdminTransactions } from "@/app/actions/admin"
import { LoadingSpinner } from "@/components/loading-spinner"

interface Transaction {
  id: string
  user_id: string
  order_id: string
  mpesa_receipt_number: string
  mpesa_transaction_date: string
  phone_number: string
  amount: number
  status: string
  result_code: number | null
  result_desc: string
  checkout_request_id: string
  merchant_request_id: string
  created_at: string
  orders: {
    ticket_number: string
    total: number
    status: string
  }
}

export function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    const result = await getAdminTransactions()
    if (result.data) {
      setTransactions(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.mpesa_receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
      txn.phone_number?.includes(search) ||
      txn.orders?.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      txn.checkout_request_id?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || txn.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-medium rounded-full">
            <CheckCircle2 size={12} />
            Completed
          </span>
        )
      case "failed":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded-full">
            <XCircle size={12} />
            Failed
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">
            <Clock size={12} />
            {status || "Pending"}
          </span>
        )
    }
  }

  // Calculate totals
  const totalCompleted = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalPending = transactions
    .filter((t) => t.status === "pending" || t.status === "stk_pushed")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading transactions" variant="inline" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Transactions</h3>
          <p className="text-sm text-muted-foreground">
            {transactions.length} total transactions
          </p>
        </div>
        <button
          onClick={loadTransactions}
          className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Transactions</p>
          <p className="text-xl font-bold text-foreground mt-1">{transactions.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-xl font-bold text-emerald-500 mt-1">
            KSh {totalCompleted.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-bold text-amber-500 mt-1">
            KSh {totalPending.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Success Rate</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {transactions.length > 0
              ? Math.round(
                  (transactions.filter((t) => t.status === "completed").length /
                    transactions.length) *
                    100
                )
              : 0}
            %
          </p>
        </div>
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
            placeholder="Search by receipt, phone, ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="stk_pushed">STK Pushed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Receipt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-muted-foreground" />
                      <span className="text-sm font-mono text-foreground">
                        {txn.mpesa_receipt_number || txn.checkout_request_id?.slice(0, 10) || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-primary">
                      {txn.orders?.ticket_number || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">
                      {txn.phone_number || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">
                      KSh {Number(txn.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(txn.status)}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No transactions found</p>
        </div>
      )}
    </div>
  )
}
