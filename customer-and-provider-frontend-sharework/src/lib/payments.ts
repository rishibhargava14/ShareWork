import { api } from "@/lib/api";
import { loadRazorpayCheckout, openRazorpayCheckout } from "@/lib/razorpay";

export type PaymentOrder = {
  orderId: string;
  amount: number;
  currency: string;
  projectId: string;
  keyId: string;
};

export async function fundProjectEscrow(
  projectId: string,
  prefill?: { name?: string; email?: string },
): Promise<{ status?: string; alreadyProcessed?: boolean }> {
  const order = await api<PaymentOrder>("/api/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });

  if (!order.orderId || !order.keyId) {
    throw new Error("Payment order is incomplete.");
  }

  const loaded = await loadRazorpayCheckout();
  if (!loaded) {
    throw new Error("Could not load Razorpay checkout.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const checkout = openRazorpayCheckout({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || "INR",
      order_id: order.orderId,
      name: "ShareWork",
      description: "Escrow funding",
      prefill,
      handler: (response) => {
        void api<{ status?: string; alreadyProcessed?: boolean }>("/api/payments/verify-checkout", {
          method: "POST",
          body: JSON.stringify({
            projectId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        })
          .then((result) => finish(() => resolve(result)))
          .catch((err) => finish(() => reject(err instanceof Error ? err : new Error("Payment verification failed."))));
      },
      modal: {
        ondismiss: () => finish(() => reject(new Error("Payment checkout was cancelled."))),
      },
    });

    checkout.on("payment.failed", (payload) => {
      finish(() => reject(new Error(payload?.error?.description || "Payment failed.")));
    });
    checkout.open();
  });
}
