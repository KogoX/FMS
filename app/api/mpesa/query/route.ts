import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { querySTKPushStatus } from "@/lib/mpesa"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { checkoutRequestId, orderId } = await request.json()

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: "Missing checkoutRequestId" },
        { status: 400 }
      )
    }

    // First check the DB for the order status (callback might have already updated it)
    if (orderId) {
      const { data: order } = await supabase
        .from("orders")
        .select("payment_status, mpesa_transaction_id")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single()

      if (order?.payment_status === "completed") {
        return NextResponse.json({
          status: "completed",
          transactionId: order.mpesa_transaction_id,
        })
      }

      if (order?.payment_status === "failed") {
        return NextResponse.json({
          status: "failed",
          message: "Payment was cancelled or failed",
        })
      }
    }

    // Query Safaricom for real-time status
    try {
      const queryResult = await querySTKPushStatus(checkoutRequestId)

      if (queryResult.ResultCode === "0") {
        // Payment completed
        return NextResponse.json({
          status: "completed",
          transactionId: queryResult.CheckoutRequestID,
        })
      }

      if (queryResult.ResultCode === "1032") {
        // User cancelled
        return NextResponse.json({
          status: "failed",
          message: "Payment was cancelled by user",
        })
      }

      if (queryResult.ResultCode === "1037") {
        // Timeout - STK push timed out
        return NextResponse.json({
          status: "failed",
          message: "Payment request timed out. Please try again.",
        })
      }

      // Still processing or other status
      return NextResponse.json({
        status: "pending",
        resultCode: queryResult.ResultCode,
        message: queryResult.ResultDesc,
      })
    } catch {
      // Query failed - the transaction might still be processing
      return NextResponse.json({ status: "pending" })
    }
  } catch (error) {
    console.error("STK Query error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
