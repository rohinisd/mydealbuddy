import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { CopyCouponCode } from "@/components/shared/CopyCouponCode";
import { getCurrentCustomer } from "@/lib/current-customer";
import { listPublicActiveCoupons } from "@/lib/coupons";

export const metadata = { title: "Coupons | MyDealBuddy" };

export default async function AccountCouponsPage() {
  const customer = await getCurrentCustomer();
  const coupons = await listPublicActiveCoupons();

  return (
    <>
      <Header />
      <AccountLayout title="Coupons" customerFirstName={customer?.firstName}>
        {coupons.length === 0 ? (
          <p className="text-sm text-text-muted">No active coupons right now — check back soon.</p>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <div key={c.code} className="flex items-center justify-between gap-3 rounded-md border border-border p-4">
                <div>
                  <p className="text-lg font-bold tracking-wide text-accent-ink">{c.code}</p>
                  <p className="text-sm text-text-secondary">
                    {c.discountType === "percent" ? `${c.discountValue}% off` : `$${c.discountValue} off`}
                    {c.minOrderValue != null && ` your order — min $${c.minOrderValue.toFixed(2)}`}
                  </p>
                </div>
                <CopyCouponCode code={c.code} />
              </div>
            ))}
          </div>
        )}
      </AccountLayout>
      <Footer />
    </>
  );
}
