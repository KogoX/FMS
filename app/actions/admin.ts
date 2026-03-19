"use server"

import { createClient } from "@/lib/supabase/server"
import { initiateSTKPush } from "@/lib/mpesa"

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

function generateShopTicketNumber(): string {
  const prefix = "POS"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

function generateReceiptNumber(): string {
  const prefix = "FG"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
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
    query = query.in("payment_status", ["pending", "stk_pushed"])
  } else if (filter === "completed") {
    query = query.eq("payment_status", "completed")
  } else if (filter === "cancelled") {
    query = query.eq("status", "cancelled")
  }

  const { data, error } = await query

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

export async function getAdminOrderById(orderId: string) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(*),
      transactions(*),
      profiles!orders_user_id_fkey(full_name, email, phone)
    `)
    .eq("id", orderId)
    .single()

  if (error) return { error: error.message }
  return { data }
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

  let ticketNumber: string | undefined
  if (transactionId === "CASH") {
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("ticket_number")
      .eq("id", orderId)
      .single()
    if (!existingOrder?.ticket_number) {
      ticketNumber = generateShopTicketNumber()
    }
  }

  // Update order
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: "completed",
      status: "confirmed",
      mpesa_transaction_id: transactionId || "",
      ...(ticketNumber ? { ticket_number: ticketNumber } : {}),
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

export async function promptPayment(
  orderId: string,
  phoneNumber?: string,
  message?: string
) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total, mpesa_number, user_id, ticket_number")
    .eq("id", orderId)
    .single()

  if (orderError || !order) return { error: orderError?.message || "Order not found" }

  const phone = phoneNumber || order.mpesa_number
  if (!phone) return { error: "Phone number is required to send STK push" }

  let rawOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (!rawOrigin) {
    return {
      error:
        "Server URL not configured. Set NEXT_PUBLIC_APP_URL to your deployed URL.",
    }
  }

  rawOrigin = rawOrigin.trim().replace(/\/+$/, "")
  if (!rawOrigin.startsWith("http://") && !rawOrigin.startsWith("https://")) {
    rawOrigin = `https://${rawOrigin}`
  }

  const callbackURL = `${rawOrigin}/api/mpesa/callback`

  const stkResponse = await initiateSTKPush({
    phoneNumber: phone,
    amount: Math.ceil(Number(order.total)),
    accountReference: `FoodGo-${order.id.slice(0, 8)}`,
    transactionDesc: "FoodGo Order Payment",
    callbackURL,
  })

  if (stkResponse.ResponseCode !== "0") {
    return {
      error:
        stkResponse.ResponseDescription || "Failed to initiate M-Pesa payment",
    }
  }

  const ticketNumber = order.ticket_number || generateShopTicketNumber()

  await supabase
    .from("orders")
    .update({
      mpesa_transaction_id: stkResponse.CheckoutRequestID,
      payment_status: "stk_pushed",
      ticket_number: ticketNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)

  const { data: existingTxn } = await supabase
    .from("transactions")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle()

  const note = message?.trim()
    ? `Admin prompt: ${message.trim()}`
    : undefined

  if (existingTxn?.id) {
    await supabase
      .from("transactions")
      .update({
        phone_number: phone,
        amount: Number(order.total),
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        status: "stk_pushed",
        ...(note ? { result_desc: note } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTxn.id)
  } else {
    await supabase.from("transactions").insert({
      user_id: order.user_id,
      order_id: orderId,
      phone_number: phone,
      amount: Number(order.total),
      checkout_request_id: stkResponse.CheckoutRequestID,
      merchant_request_id: stkResponse.MerchantRequestID,
      status: "stk_pushed",
      ...(note ? { result_desc: note } : {}),
    })
  }

  return {
    success: true,
    data: {
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
      customerMessage: stkResponse.CustomerMessage,
    },
  }
}

export async function createInShopOrder(input: {
  amount: number
  phoneNumber?: string
  message?: string
  promptPayment?: boolean
  cashPaid?: boolean
}) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase, user } = auth

  if (!user?.id) return { error: "Admin user not found" }
  if (!input.amount || Number.isNaN(input.amount) || input.amount <= 0) {
    return { error: "Amount must be greater than 0" }
  }

  const ticketNumber = generateShopTicketNumber()
  const receiptNumber = generateReceiptNumber()
  const phone = input.phoneNumber?.trim() || ""
  const note = input.message?.trim()
    ? `Admin prompt: ${input.message.trim()}`
    : null

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      total: Number(input.amount),
      delivery_fee: 0,
      discount: 0,
      delivery_address: "In-shop",
      mpesa_number: phone,
      mpesa_transaction_id: "",
      payment_status: "pending",
      receipt_number: receiptNumber,
      ticket_number: ticketNumber,
    })
    .select()
    .single()

  if (orderError || !order) return { error: orderError?.message || "Failed to create order" }

  await supabase.from("transactions").insert({
    user_id: user.id,
    order_id: order.id,
    phone_number: phone,
    amount: Number(input.amount),
    status: input.cashPaid ? "completed" : "pending",
    ...(note ? { result_desc: note } : {}),
  })

  if (input.cashPaid) {
    await verifyPayment(order.id, "CASH")
    return { success: true, data: { orderId: order.id, ticketNumber } }
  }

  if (input.promptPayment) {
    const promptResult = await promptPayment(order.id, phone, input.message)
    if (promptResult?.error) return { error: promptResult.error }
  }

  return { success: true, data: { orderId: order.id, ticketNumber } }
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
    is_available: item.is_available,
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
  is_available?: boolean
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
      is_available: input.is_available !== undefined ? input.is_available : true,
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
    is_available?: boolean
  }
) {
  const auth = await getSupabaseAdmin()
  if (!auth.isAdmin || !auth.supabase) return { error: auth.error }
  const { supabase } = auth

  const updatePayload: Record<string, unknown> = {}
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
  if (input.is_available !== undefined) updatePayload.is_available = input.is_available

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

  // Check if item has been ordered
  const { count, error: countError } = await supabase
    .from("order_items")
    .select("*", { count: "exact", head: true })
    .eq("food_item_id", id)

  if (countError) return { error: countError.message }

  if (count && count > 0) {
    return { error: "Cannot delete this food item because it has existing orders. Please edit it to mark as unavailable instead." }
  }

  const { error } = await supabase
    .from("food_items")
    .delete()
    .eq("id", id)

  if (error) {
    return { error: error.message }
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
