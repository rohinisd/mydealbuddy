import { NextRequest, NextResponse } from "next/server";
import { verifyPaypalWebhookSignature } from "@/lib/paypal";
import { markOrderRefundedByCaptureId } from "@/lib/order-refunds";

/**
 * Catches refunds issued directly in the PayPal dashboard (bypassing our
 * admin refund button) so our order status doesn't silently drift from
 * reality. Register this URL under the app's Webhooks tab at
 * developer.paypal.com, subscribed to at least PAYMENT.CAPTURE.REFUNDED,
 * then set PAYPAL_WEBHOOK_ID to the webhook id it gives you -- PayPal can't
 * deliver to localhost, so this can only be verified live once deployed.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let verified: boolean;
  try {
    verified = await verifyPaypalWebhookSignature(
      {
        transmissionId: request.headers.get("paypal-transmission-id") || "",
        transmissionTime: request.headers.get("paypal-transmission-time") || "",
        certUrl: request.headers.get("paypal-cert-url") || "",
        authAlgo: request.headers.get("paypal-auth-algo") || "",
        transmissionSig: request.headers.get("paypal-transmission-sig") || "",
      },
      rawBody
    );
  } catch (err) {
    console.error("PayPal webhook verification failed:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }

  if (!verified) {
    console.error("PayPal webhook signature did not verify -- rejecting.");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
    const captureId = event.resource?.links?.find((l: { rel: string }) => l.rel === "up")?.href?.split("/").pop();
    const refundId = event.resource?.id;
    if (captureId && refundId) {
      await markOrderRefundedByCaptureId(captureId, refundId);
    } else {
      console.error("PAYMENT.CAPTURE.REFUNDED webhook missing capture/refund id:", JSON.stringify(event.resource));
    }
  }

  return NextResponse.json({ ok: true });
}
