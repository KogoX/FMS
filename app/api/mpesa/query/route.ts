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

      if (queryResult.ResultCode === "0") {
        // Payment completed
        let parsedReceipt = queryResult.CheckoutRequestID;
        // Check for receipt in format: "[SAJ1234567] The service request..."
        const match = queryResult.ResultDesc?.match(/\[([a-zA-Z0-9]+)\]/);
        if (match && match[1]) {
          parsedReceipt = match[1];
        } else {
          // fallback regex looking for a 10-char alphanumeric M-Pesa receipt
          const fallbackMatch = queryResult.ResultDesc?.match(/([A-Z0-9]{10})/);
          if (fallbackMatch && fallbackMatch[1]) {
            parsedReceipt = fallbackMatch[1];
          }
        }

        const updates: any = { payment_status: "completed", status: "confirmed" };
        if (parsedReceipt !== queryResult.CheckoutRequestID) {
          updates.mpesa_transaction_id = parsedReceipt;
        }

        const transactionUpdates: any = {
          status: "completed",
          result_code: queryResult.ResultCode,
          result_desc: queryResult.ResultDesc,
        };
        if (parsedReceipt !== queryResult.CheckoutRequestID) {
          transactionUpdates.mpesa_receipt_number = parsedReceipt;
        }

        await updateOrderAndTransaction(updates, transactionUpdates);
        
        return NextResponse.json({
          status: "completed",
          transactionId: parsedReceipt,
        })
      }

      if (queryResult.ResultCode === "1032") {
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

      if (queryResult.ResultCode === "1037") {
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
