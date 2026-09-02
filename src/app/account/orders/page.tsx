import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ReorderButton } from "@/components/account/ReorderButton";
import { getCurrentCustomer } from "@/lib/current-customer";
import { listOrdersForCustomer } from "@/lib/orders";

export const metadata = { title: "Orders | MyDealBuddy" };

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function OrdersPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/account/orders");

  const orders = await listOrdersForCustomer(customer.id);

  return (
    <>
    <Header />
    <AccountLayout title="Orders" customerFirstName={customer.firstName}>
      {orders.length === 0 ? (
        <p className="text-sm text-text-muted">You haven&apos;t placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-text-primary">{order.orderNumber}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-accent-ink">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <ReorderButton lines={order.lines} />
                </div>
              </div>

              <ul className="mt-3 space-y-1 text-sm text-text-secondary">
                {order.lines.map((line, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="truncate pr-2">
                      {line.productName} × {line.quantity}
                    </span>
                    <span className="shrink-0 font-medium text-text-primary">${(line.unitPrice * line.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                <span className="text-text-muted">Earned {order.buddyCoinsEarned} Buddy Coins</span>
                <span className="font-bold text-text-primary">Total ${order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
    <Footer />
    </>
  );
}
