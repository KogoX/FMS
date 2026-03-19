import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { initiateSTKPush } from "@/lib/mpesa"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { phoneNumber, orderId } = body

    if (!phoneNumber || !orderId) {
      return NextResponse.json(
        { error: "Missing phoneNumber or orderId" },
        { status: 400 }
      )
    }

    // Fetch the correct order details from the database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("total")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found or unauthorized" },
        { status: 404 }
      )
    }

    // Use total directly as KSh
    const validatedAmountKSh = Math.ceil(order.total)

    // Build callback URL - must be publicly reachable HTTPS
    // Priority: explicit app URL > Vercel production URL > Vercel branch URL
    let rawOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null) ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null)

    if (!rawOrigin) {
      return NextResponse.json(
        { error: "Server URL not configured. Set NEXT_PUBLIC_APP_URL environment variable to your deployed URL (e.g. https://your-app.vercel.app)." },
        { status: 500 }
      )
    }

    // Normalize: ensure https:// prefix and no trailing slash
    rawOrigin = rawOrigin.trim().replace(/\/+$/, "")
    if (!rawOrigin.startsWith("http://") && !rawOrigin.startsWith("https://")) {
      rawOrigin = `https://${rawOrigin}`
    }

    const callbackURL = `${rawOrigin}/api/mpesa/callback`

    const stkResponse = await initiateSTKPush({
      phoneNumber,
      amount: validatedAmountKSh,
      accountReference: `FoodGo-${orderId.slice(0, 8)}`,
      transactionDesc: "FoodGo Order Payment",
      callbackURL,
    })

    if (stkResponse.ResponseCode === "0") {
      // Update order with checkout request ID for tracking
      await supabase
        .from("orders")
        .update({
          mpesa_transaction_id: stkResponse.CheckoutRequestID,
          payment_status: "stk_pushed",
        })
        .eq("id", orderId)
        .eq("user_id", user.id)

      // Update transaction record with checkout details
      await supabase
        .from("transactions")
        .update({
          checkout_request_id: stkResponse.CheckoutRequestID,
          merchant_request_id: stkResponse.MerchantRequestID,
          status: "stk_pushed",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .eq("user_id", user.id)

      return NextResponse.json({
        success: true,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        customerMessage: stkResponse.CustomerMessage,
      })
    }

    return NextResponse.json(
      {
        error:
          stkResponse.ResponseDescription ||
          "Failed to initiate M-Pesa payment",
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("STK Push error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
