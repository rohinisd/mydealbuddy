import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/plp/Breadcrumb";

export function InfoPage({
  title,
  crumbLabel,
  children,
  wide,
}: {
  title: string;
  crumbLabel?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className={`mx-auto px-4 py-6 ${wide ? "max-w-[1280px]" : "max-w-3xl"}`}>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: crumbLabel ?? title }]} />
          <h1 className="mb-6 mt-2 text-2xl font-bold text-text-primary">{title}</h1>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
