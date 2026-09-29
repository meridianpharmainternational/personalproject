/**
 * Shown as soon as an admin page is opened (a tab, Edit, New product) until
 * its data arrives. The admin bar above stays in place. The spinner fades in
 * after 150ms (globals.css .page-loading), so a quick page never flashes it.
 */
export default function AdminLoading() {
  return (
    <div className="page-loading" role="status">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}
