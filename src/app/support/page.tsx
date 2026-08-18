import Link from "next/link";
import { InfoPage } from "@/components/info/InfoPage";

export const metadata = { title: "24/7 Support | MyDealBuddy" };

export default function SupportPage() {
  return (
    <InfoPage title="24/7 Support">
      <p className="text-sm text-text-secondary">
        We&apos;re here whenever you need us. Reach out any way that&apos;s easiest:
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-bold text-text-primary">Email</p>
          <a href="mailto:Help.allinoneonline@gmail.com" className="mt-1 block text-sm text-accent hover:underline">
            Help.allinoneonline@gmail.com
          </a>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-bold text-text-primary">Contact Form</p>
          <Link href="/contact" className="mt-1 block text-sm text-accent hover:underline">
            Send a message
          </Link>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-bold text-text-primary">Help Center</p>
          <Link href="/faqs" className="mt-1 block text-sm text-accent hover:underline">
            Browse FAQs
          </Link>
        </div>
      </div>
    </InfoPage>
  );
}
