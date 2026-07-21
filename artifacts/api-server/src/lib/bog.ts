import { createVerify } from "node:crypto";

const BOG_CLIENT_ID = process.env.BOG_CLIENT_ID;
const BOG_CLIENT_SECRET = process.env.BOG_CLIENT_SECRET;

const BOG_TOKEN_URL =
  "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
const BOG_API_BASE = "https://api.bog.ge/payments/v1";

// Published by Bank of Georgia for verifying the Callback-Signature header
// (SHA256withRSA over the raw callback request body).
// https://api.bog.ge/docs/en/payments/standard-process/callback
const BOG_CALLBACK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;

export function isBogConfigured(): boolean {
  return Boolean(BOG_CLIENT_ID && BOG_CLIENT_SECRET);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!isBogConfigured()) {
    throw new Error("Bank of Georgia payments are not configured");
  }
  // Reuse the token until shortly before expiry.
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }
  const auth = Buffer.from(`${BOG_CLIENT_ID}:${BOG_CLIENT_SECRET}`).toString(
    "base64",
  );
  const res = await fetch(BOG_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bank of Georgia auth failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  // expires_in is documented as "seconds while the token is active"; guard
  // against absurd values by capping the cache window at 10 minutes.
  const ttlMs = Math.min(Math.max(Number(data.expires_in) || 0, 60), 600) * 1000;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

export interface BogCreatedOrder {
  orderId: string;
  redirectUrl: string;
}

export async function createBogOrder(params: {
  amount: number;
  currency: string;
  externalOrderId: string;
  productId: string;
  callbackUrl: string;
  successUrl: string;
  failUrl: string;
}): Promise<BogCreatedOrder> {
  const token = await getAccessToken();
  const res = await fetch(`${BOG_API_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept-Language": "en",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      callback_url: params.callbackUrl,
      external_order_id: params.externalOrderId,
      purchase_units: {
        currency: params.currency,
        total_amount: Number(params.amount.toFixed(2)),
        basket: [
          {
            quantity: 1,
            unit_price: Number(params.amount.toFixed(2)),
            product_id: params.productId,
          },
        ],
      },
      redirect_urls: {
        success: params.successUrl,
        fail: params.failUrl,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Bank of Georgia create order failed: ${res.status} ${text}`,
    );
  }
  const data = (await res.json()) as {
    id: string;
    _links?: { redirect?: { href?: string } };
  };
  const redirectUrl = data._links?.redirect?.href;
  if (!redirectUrl) {
    throw new Error("Bank of Georgia did not return a redirect link");
  }
  return { orderId: data.id, redirectUrl };
}

export interface BogPaymentDetails {
  orderId: string;
  externalOrderId: string | null;
  statusKey: string;
  transferAmount: number | null;
  currency: string | null;
}

export async function getBogPaymentDetails(
  orderId: string,
): Promise<BogPaymentDetails> {
  const token = await getAccessToken();
  const res = await fetch(
    `${BOG_API_BASE}/receipt/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Bank of Georgia payment details failed: ${res.status} ${text}`,
    );
  }
  const data = (await res.json()) as {
    order_id: string;
    external_order_id?: string | null;
    order_status?: { key?: string };
    purchase_units?: {
      transfer_amount?: string | number;
      currency_code?: string;
    };
  };
  return {
    orderId: data.order_id,
    externalOrderId: data.external_order_id ?? null,
    statusKey: data.order_status?.key ?? "unknown",
    transferAmount:
      data.purchase_units?.transfer_amount != null
        ? Number(data.purchase_units.transfer_amount)
        : null,
    currency: data.purchase_units?.currency_code ?? null,
  };
}

/**
 * Verify the Callback-Signature header against the raw request body using
 * BoG's published RSA public key (SHA256withRSA). Must run on the raw bytes,
 * before any JSON parse/re-serialize, so field order is preserved.
 */
export function verifyBogCallbackSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(
      typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody,
    );
    verifier.end();
    return verifier.verify(BOG_CALLBACK_PUBLIC_KEY, signature, "base64");
  } catch {
    return false;
  }
}
