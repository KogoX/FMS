const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"

interface MpesaTokenResponse {
  access_token: string
  expires_in: string
}

interface STKPushRequest {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
  callbackURL: string
}

interface STKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface STKQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

/**
 * Get OAuth access token from Safaricom Daraja API
 */
export async function getAccessToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim()
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim()

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa consumer key/secret not configured")
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")

  const response = await fetch(
    `${SANDBOX_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const text = await response.text()
    const wwwAuth = response.headers.get("www-authenticate")
    const requestId =
      response.headers.get("request-id") ||
      response.headers.get("x-request-id") ||
      response.headers.get("x-correlation-id")
    const debugParts = [
      `status=${response.status}`,
      wwwAuth ? `www-authenticate=${wwwAuth}` : null,
      requestId ? `request-id=${requestId}` : null,
      `keyLen=${consumerKey?.length || 0}`,
      `secretLen=${consumerSecret?.length || 0}`,
      `body=${text || "<empty>"}`,
    ].filter(Boolean)
    throw new Error(`Failed to get access token: ${debugParts.join(" | ")}`)
  }

  const data: MpesaTokenResponse = await response.json()
  return data.access_token
}

/**
 * Generate the password for STK Push (Base64 of BusinessShortCode + Passkey + Timestamp)
 */
function generatePassword(timestamp: string): string {
  const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE || "174379"
  const passkey = process.env.MPESA_PASSKEY || ""
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64")
}

/**
 * Generate timestamp in the format YYYYMMDDHHmmss
 */
function generateTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

/**
 * Format phone number to 254 format (e.g., 0712345678 -> 254712345678)
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-+()]/g, "")
  if (cleaned.startsWith("0")) {
    cleaned = `254${cleaned.slice(1)}`
  } else if (cleaned.startsWith("+254")) {
    cleaned = cleaned.slice(1)
  } else if (!cleaned.startsWith("254")) {
    cleaned = `254${cleaned}`
  }
  return cleaned
}

/**
 * Initiate STK Push (Lipa na M-Pesa Online)
 */
export async function initiateSTKPush(
  request: STKPushRequest
): Promise<STKPushResponse> {
  const accessToken = await getAccessToken()
  const timestamp = generateTimestamp()
  const password = generatePassword(timestamp)
  const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE || "174379"

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(request.amount),
    PartyA: formatPhoneNumber(request.phoneNumber),
    PartyB: shortCode,
    PhoneNumber: formatPhoneNumber(request.phoneNumber),
    CallBackURL: request.callbackURL,
    AccountReference: request.accountReference,
    TransactionDesc: request.transactionDesc,
  }

  const response = await fetch(
    `${SANDBOX_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`STK Push failed: ${response.status} - ${text}`)
  }

  return response.json()
}

/**
 * Query the status of an STK Push transaction
 */
export async function querySTKPushStatus(
  checkoutRequestId: string
): Promise<STKQueryResponse> {
  const accessToken = await getAccessToken()
  const timestamp = generateTimestamp()
  const password = generatePassword(timestamp)
  const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE || "174379"

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const response = await fetch(
    `${SANDBOX_BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`STK Query failed: ${response.status} - ${text}`)
  }

  return response.json()
}
