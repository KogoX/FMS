"use server"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface CallbackItem {
  Name: string
  Value: string | number
}

interface STKCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: CallbackItem[]
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const body: STKCallback = await request.json()
    const callback = body.Body.stkCallback
    const supabase = await createClient()

    if (callback.ResultCode === 0) {
      // Payment successful
      const metadata = callback.CallbackMetadata?.Item || []
      const mpesaReceiptNumber = String(
        metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value || ""
      )
      const transactionDate = String(
        metadata.find((i) => i.Name === "TransactionDate")?.Value || ""
      )
      const phoneNumber = String(
        metadata.find((i) => i.Name === "PhoneNumber")?.Value || ""
      )
      const amount = Number(
        metadata.find((i) => i.Name === "Amount")?.Value || 0
      )

      // Update order as paid
      const { data: updatedOrder } = await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          status: "confirmed",
          mpesa_transaction_id: mpesaReceiptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("mpesa_transaction_id", callback.CheckoutRequestID)
        .select("id, user_id")
        .single()

      // Update the transaction record
      if (updatedOrder) {
        await supabase
          .from("transactions")
          .update({
            status: "completed",
            mpesa_receipt_number: mpesaReceiptNumber,
            mpesa_transaction_date: transactionDate,
            phone_number: phoneNumber,
            amount: amount,
            result_code: callback.ResultCode,
            result_desc: callback.ResultDesc,
            checkout_request_id: callback.CheckoutRequestID,
            merchant_request_id: callback.MerchantRequestID,
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", updatedOrder.id)
          .eq("user_id", updatedOrder.user_id)
      }
    } else {
      // Payment failed or cancelled
      const { data: failedOrder } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("mpesa_transaction_id", callback.CheckoutRequestID)
        .select("id, user_id")
        .single()

      if (failedOrder) {
        await supabase
          .from("transactions")
          .update({
            status: "failed",
            result_code: callback.ResultCode,
            result_desc: callback.ResultDesc,
            checkout_request_id: callback.CheckoutRequestID,
            merchant_request_id: callback.MerchantRequestID,
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", failedOrder.id)
          .eq("user_id", failedOrder.user_id)
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  } catch (error) {
    console.error("M-Pesa callback error:", error)
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  }
}
