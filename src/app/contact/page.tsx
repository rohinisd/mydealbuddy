import { InfoPage } from "@/components/info/InfoPage";
import { ContactForm } from "@/components/info/ContactForm";

export const metadata = { title: "Contact Support | MyDealBuddy" };

export default function ContactPage() {
  return (
    <InfoPage title="Contact Support">
      <p className="mb-6 text-sm text-text-secondary">
        Reach us anytime at{" "}
        <a href="mailto:Help.allinoneonline@gmail.com" className="font-semibold text-accent hover:underline">
          Help.allinoneonline@gmail.com
        </a>{" "}
        or use the form below.
      </p>
      <ContactForm />
    </InfoPage>
  );
}
