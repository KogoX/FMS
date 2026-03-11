"use server"

import { createClient } from "@/lib/supabase/server"

interface OrderItemInput {
  food_item_id: string
  food_name: string
  food_price: number
  quantity: number
  selected_toppings: string[]
  selected_sides: string[]
}

function generateReceiptNumber(): string {
  const prefix = "FG"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Step 1: Create a pending order in the DB (before payment)
 */
export async function createPendingOrder(input: {
  items: OrderItemInput[]
  total: number
  delivery_fee: number
  discount: number
  delivery_address: string
  mpesa_number: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const receiptNumber = generateReceiptNumber()

  // Create the order with pending status
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      total: input.total,
      delivery_fee: input.delivery_fee,
      discount: input.discount,
      delivery_address: input.delivery_address,
      mpesa_number: input.mpesa_number,
      mpesa_transaction_id: "",
      payment_status: "pending",
      receipt_number: receiptNumber,
    })
    .select()
    .single()

  if (orderError) return { error: orderError.message }

  // Create order items
  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    food_item_id: item.food_item_id,
    food_name: item.food_name,
    food_price: item.food_price,
    quantity: item.quantity,
    selected_toppings: item.selected_toppings,
    selected_sides: item.selected_sides,
  }))

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems)

  if (itemsError) return { error: itemsError.message }

  // Create pending transaction record
  await supabase.from("transactions").insert({
    user_id: user.id,
    order_id: order.id,
    phone_number: input.mpesa_number,
    amount: input.total,
    status: "pending",
  })

  return { data: { orderId: order.id, receiptNumber } }
}

/**
 * Step 2: After STK push is confirmed, finalize the order and clear cart
 */
export async function finalizeOrder(orderId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Clear user's cart items
  await supabase.from("cart_items").delete().eq("user_id", user.id)

  return { success: true }
}

/**
 * Cancel a pending order (if payment fails/times out)
 */
export async function cancelOrder(orderId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .eq("payment_status", "pending")
    .select()
    .single()

  if (orderError) return { error: orderError.message }
  if (!order) return { error: "Order not cancellable" }

  // Update transaction status
  const { error: txnError } = await supabase
    .from("transactions")
    .update({
      status: "failed",
      result_desc: "Payment cancelled or timed out",
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("user_id", user.id)

  if (txnError) return { error: txnError.message }
  return { success: true, data: order }
}

/**
 * Get all orders with items and transactions
 */
export async function getOrders() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated", data: [] }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), transactions(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

/**
 * Get a single order with full details for receipt
 */
export async function getOrderReceipt(orderId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), transactions(*)")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single()

  if (error) return { error: error.message }

  // Get profile for receipt
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return { data, profile }
}
