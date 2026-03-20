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
        let receiptId = order.mpesa_transaction_id

        // Check transactions table for the real M-Pesa receipt
        if (!receiptId || receiptId.startsWith("ws_CO")) {
          const { data: txn } = await supabase
            .from("transactions")
            .select("mpesa_receipt_number")
            .eq("order_id", orderId)
            .eq("user_id", user.id)
            .single()

          if (txn?.mpesa_receipt_number) {
            receiptId = txn.mpesa_receipt_number
          }
        }

        const isPending = !receiptId || receiptId.startsWith("ws_CO")
        return NextResponse.json({
          status: "completed",
          transactionId: receiptId || checkoutRequestId,
          receiptPending: isPending,
        })
      }

      if (order?.payment_status === "failed") {
        return NextResponse.json({
          status: "failed",
          message: "Payment was cancelled or failed",
        })
      }
    }

    const updateOrderAndTransaction = async (
      updates: { payment_status: string; status: string },
      transactionUpdates: { status: string; result_code: string; result_desc: string }
    ) => {
      const updatedAt = new Date().toISOString()
      if (orderId) {
        await supabase
          .from("orders")
          .update({ ...updates, updated_at: updatedAt })
          .eq("id", orderId)
          .eq("user_id", user.id)
        await supabase
          .from("transactions")
          .update({ ...transactionUpdates, updated_at: updatedAt })
          .eq("order_id", orderId)
          .eq("user_id", user.id)
        return
      }

      // Fallback to checkoutRequestId if orderId wasn't provided
      await supabase
        .from("orders")
        .update({ ...updates, updated_at: updatedAt })
        .eq("mpesa_transaction_id", checkoutRequestId)
        .eq("user_id", user.id)

      await supabase
        .from("transactions")
        .update({ ...transactionUpdates, updated_at: updatedAt })
        .eq("checkout_request_id", checkoutRequestId)
        .eq("user_id", user.id)
    }

    // Query Safaricom for real-time status
    try {
      const queryResult = await querySTKPushStatus(checkoutRequestId)

      if (String(queryResult.ResultCode) === "0") {
        // Payment completed — Daraja STK Query does NOT return the real
        // M-Pesa receipt. The receipt only arrives via the callback webhook.
        // We update the order status here, then re-read the DB to see if
        // the callback has already written the real receipt.

        // Mark order as completed (callback may have already done this)
        await updateOrderAndTransaction(
          { payment_status: "completed", status: "confirmed" },
          {
            status: "completed",
            result_code: queryResult.ResultCode,
            result_desc: queryResult.ResultDesc,
          }
        )

        // Brief delay to give the callback a chance to land first
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Re-read the order to pick up the callback-updated receipt
        let realReceipt: string | null = null
        if (orderId) {
          const { data: freshOrder } = await supabase
            .from("orders")
            .select("mpesa_transaction_id")
            .eq("id", orderId)
            .eq("user_id", user.id)
            .single()

          if (freshOrder?.mpesa_transaction_id) {
            realReceipt = freshOrder.mpesa_transaction_id
          }
        }

        // Also check the transaction table for the receipt
        if (!realReceipt || realReceipt.startsWith("ws_CO")) {
          const txnQuery = orderId
            ? supabase
                .from("transactions")
                .select("mpesa_receipt_number")
                .eq("order_id", orderId)
                .eq("user_id", user.id)
                .single()
            : supabase
                .from("transactions")
                .select("mpesa_receipt_number")
                .eq("checkout_request_id", checkoutRequestId)
                .eq("user_id", user.id)
                .single()

          const { data: txn } = await txnQuery
          if (txn?.mpesa_receipt_number) {
            realReceipt = txn.mpesa_receipt_number
          }
        }

        const finalReceipt =
          realReceipt && !realReceipt.startsWith("ws_CO")
            ? realReceipt
            : checkoutRequestId

        return NextResponse.json({
          status: "completed",
          transactionId: finalReceipt,
          receiptPending: finalReceipt === checkoutRequestId,
        })
      }

      if (String(queryResult.ResultCode) === "1032") {
        // User cancelled
        await updateOrderAndTransaction(
          { payment_status: "failed", status: "cancelled" },
          {
            status: "failed",
            result_code: queryResult.ResultCode,
            result_desc: queryResult.ResultDesc,
          }
        )
        return NextResponse.json({
          status: "cancelled",
          message: "Payment was cancelled by user",
        })
      }

      if (String(queryResult.ResultCode) === "1037") {
        // Timeout - STK push timed out
        await updateOrderAndTransaction(
          { payment_status: "failed", status: "cancelled" },
          {
            status: "failed",
            result_code: queryResult.ResultCode,
            result_desc: queryResult.ResultDesc,
          }
        )
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
