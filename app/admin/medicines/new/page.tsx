import Link from "next/link";
import { adminGetCategories } from "@/lib/admin/data";
import { MedicineForm } from "@/components/admin/medicine-form";

export const metadata = { title: "Add medicine" };

export default async function NewMedicinePage() {
  const categories = await adminGetCategories();

  return (
    <div>
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          <li>
            <Link href="/admin">Dashboard</Link>
          </li>
          <li>
            <Link href="/admin/medicines">Medicines</Link>
          </li>
          <li aria-current="page">Add medicine</li>
        </ol>
      </nav>

      <header className="mt-2">
        <p className="kicker">New product</p>
        <h1 className="mt-2 text-h2">Add medicine</h1>
        <p className="mt-2 max-w-[60ch] text-fg-muted">
          Only the name is required. Everything else can be filled in later.
        </p>
      </header>

      <div className="mt-8">
        <MedicineForm categories={categories} />
      </div>
    </div>
  );
}
