"use server"

import { createClient } from "@/lib/supabase/server"

// Set to false for production
const DEV_MODE = false

// Helper to get supabase client (skips auth in dev mode)
async function getSupabaseAdmin() {
  const supabase = await createClient()
  
  if (DEV_MODE) {
    return { supabase, isAdmin: true }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated", isAdmin: false }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) return { error: profileError.message, isAdmin: false }
  if (profile?.role !== "admin") return { error: "Not authorized", isAdmin: false }

  return { user, supabase, isAdmin: true }
}

// Check if current user is admin
export async function checkIsAdmin() {
  if (DEV_MODE) return { isAdmin: true }
  const result = await getSupabaseAdmin()
  return { isAdmin: result.isAdmin, error: result.error }
}

// ==================== ANALYTICS ====================

export async function getAdminStats() {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  // Get all completed orders
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total, created_at, payment_status, status")
    .eq("payment_status", "completed")

  if (ordersError) return { error: ordersError.message }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  let totalEarnings = 0
  let todayEarnings = 0
  let weekEarnings = 0
  let monthEarnings = 0
  let todayOrders = 0
  let weekOrders = 0
  let monthOrders = 0

  const dailyData: { [key: string]: number } = {}

  for (const order of orders || []) {
    const orderDate = new Date(order.created_at)
    const total = Number(order.total) || 0
    totalEarnings += total

    // Daily breakdown for chart (last 30 days)
    const dateKey = orderDate.toISOString().split("T")[0]
    dailyData[dateKey] = (dailyData[dateKey] || 0) + total

    if (orderDate >= today) {
      todayEarnings += total
      todayOrders++
    }
    if (orderDate >= weekAgo) {
      weekEarnings += total
      weekOrders++
    }
    if (orderDate >= monthAgo) {
      monthEarnings += total
      monthOrders++
    }
  }

  // Generate chart data for last 30 days
  const chartData = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dateKey = date.toISOString().split("T")[0]
    chartData.push({
      date: dateKey,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      earnings: dailyData[dateKey] || 0,
    })
  }

  // Get pending orders count
  const { count: pendingCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("payment_status", "pending")

  // Get total users count
  const { count: usersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  // Get total food items count
  const { count: foodCount } = await supabase
    .from("food_items")
    .select("*", { count: "exact", head: true })

  return {
    data: {
      totalEarnings,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      totalOrders: orders?.length || 0,
      todayOrders,
      weekOrders,
      monthOrders,
      pendingOrders: pendingCount || 0,
      totalUsers: usersCount || 0,
      totalFoodItems: foodCount || 0,
      chartData,
    },
  }
}

// ==================== ORDERS MANAGEMENT ====================

export async function getAdminOrders(filter?: "all" | "pending" | "completed" | "cancelled") {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error, data: [] }
  const { supabase } = auth

  let query = supabase
    .from("orders")
    .select(`
      *,
      order_items(*),
      transactions(*),
      profiles!orders_user_id_fkey(full_name, email, phone)
    `)
    .order("created_at", { ascending: false })

  if (filter === "pending") {
    query = query.eq("payment_status", "pending")
  } else if (filter === "completed") {
    query = query.eq("payment_status", "completed")
  } else if (filter === "cancelled") {
    query = query.eq("status", "cancelled")
  }

  const { data, error } = await query

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

export async function updateOrderStatus(orderId: string, status: string, paymentStatus?: string) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  const updates: Record<string, string> = { status, updated_at: new Date().toISOString() }
  if (paymentStatus) {
    updates.payment_status = paymentStatus
  }

  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function verifyPayment(orderId: string, transactionId?: string) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  // Update order
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: "completed",
      status: "confirmed",
      mpesa_transaction_id: transactionId || "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)

  if (orderError) return { error: orderError.message }

  // Update transaction if exists
  if (transactionId) {
    await supabase
      .from("transactions")
      .update({
        status: "completed",
        mpesa_receipt_number: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
  }

  return { success: true }
}

// ==================== FOOD MANAGEMENT ====================

export async function getAdminFoodItems() {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error, data: [] }
  const { supabase } = auth

  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (error) return { error: error.message, data: [] }
  const normalized = (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: Number(item.price),
    description: item.description,
    image: item.image_url,
    calories: item.calories,
    protein: item.protein,
    rating: Number(item.rating),
    delivery_time: item.delivery_time,
    bun_type: item.bun_type || undefined,
  }))
  return { data: normalized }
}

export async function createFoodItem(input: {
  name: string
  category: string
  price: number
  description: string
  image: string
  calories: number
  protein: string
  rating: number
  delivery_time: string
  bun_type?: string
}) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  const { data, error } = await supabase
    .from("food_items")
    .insert({
      name: input.name,
      category: input.category,
      price: input.price,
      description: input.description,
      image_url: input.image,
      calories: input.calories,
      protein: input.protein,
      rating: input.rating,
      rating_count: 0,
      delivery_time: input.delivery_time,
      bun_type: input.bun_type || null,
      is_available: true,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateFoodItem(
  id: string,
  input: {
    name?: string
    category?: string
    price?: number
    description?: string
    image?: string
    calories?: number
    protein?: string
    rating?: number
    delivery_time?: string
    bun_type?: string
  }
) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.name !== undefined) updatePayload.name = input.name
  if (input.category !== undefined) updatePayload.category = input.category
  if (input.price !== undefined) updatePayload.price = input.price
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.image !== undefined) updatePayload.image_url = input.image
  if (input.calories !== undefined) updatePayload.calories = input.calories
  if (input.protein !== undefined) updatePayload.protein = input.protein
  if (input.rating !== undefined) updatePayload.rating = input.rating
  if (input.delivery_time !== undefined)
    updatePayload.delivery_time = input.delivery_time
  if (input.bun_type !== undefined) updatePayload.bun_type = input.bun_type || null

  const { data, error } = await supabase
    .from("food_items")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function deleteFoodItem(id: string) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  const { error } = await supabase
    .from("food_items")
    .delete()
    .eq("id", id)

  if (error) {
    const { error: softError } = await supabase
      .from("food_items")
      .update({ is_available: false, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (softError) return { error: error.message }
    return { success: true, softDeleted: true }
  }
  return { success: true }
}

// ==================== TRANSACTIONS ====================

export async function getAdminTransactions() {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error, data: [] }
  const { supabase } = auth

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      orders(ticket_number, total, status)
    `)
    .order("created_at", { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}
