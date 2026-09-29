"use client";

import { useEffect, useRef, useState } from "react";
import { enquiryList, MAX_ITEMS, useEnquiryList } from "@/lib/enquiry-list";
import { announce, toast, useToast } from "@/lib/ui-store";

/** Space kept between the toast and the drawer's sticky footer. */
const FOOT_GAP = 12;

/**
 * While the enquiry drawer is open below 1024px, the toast's default position
 * lands on the drawer's sticky footer ("Continue" / "Keep browsing"). Returns
 * the `bottom` offset (px) that lifts it clear of the footer, or null to keep
 * the stylesheet position. Tracks footer height changes (step 2 is taller) and
 * viewport changes across the breakpoint.
 */
function useDrawerFootLift(active: boolean): number | null {
  const [lift, setLift] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const mq = window.matchMedia("(max-width: 1023.98px)");
    let foot: HTMLElement | null = null;
    let raf = 0;
    // offsetHeight ignores the sheet's open transform and includes the
    // safe-area padding, and the footer always sits at the viewport bottom.
    const measure = () => setLift(mq.matches && foot ? foot.offsetHeight + FOOT_GAP : null);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    const find = (tries: number) => {
      foot =
        document.querySelector(".drawer-steps")?.closest(".drawer")?.querySelector<HTMLElement>(".drawer-foot") ??
        null;
      if (foot) {
        ro?.observe(foot);
        measure();
      } else if (tries > 0) {
        raf = window.requestAnimationFrame(() => find(tries - 1));
      }
    };
    find(30);
    mq.addEventListener("change", measure);
    return () => {
      window.cancelAnimationFrame(raf);
      ro?.disconnect();
      mq.removeEventListener("change", measure);
      setLift(null);
    };
  }, [active]);

  return active ? lift : null;
}

const lineCount = (k: number) => `${k} line${k === 1 ? "" : "s"}`;

/** "2 lines updated to the packs you pasted" (lines already listed that took pasted packs). */
const updatedNote = (k: number) => `${lineCount(k)} updated to the packs you pasted`;

/**
 * One toast at a time. Store "flash" events (every add) become
 * "Cenforce 100 added · 4 products · [View list] [Undo]" (or "already in your
 * list", or "Your list is full" at MAX_ITEMS; a partly cut batch adds
 * "· list full, N not added"; a paste that changed packs on listed lines adds
 * "· N lines updated to the packs you pasted"). Undo removes the added lines and
 * puts back any "to be advised" lines they replaced. Auto-dismisses after 5 s,
 * pausing while hovered or focused.
 * Announcements go through <LiveRegion/>, so the toast itself has no live role
 * (avoids double announcements). They also cover the drawer's "Add N pasted
 * lines & continue", where the paste box and its own status unmount.
 */
export function EnquiryToast() {
  const { flash, open } = useEnquiryList();
  const data = useToast();
  const seen = useRef(0);
  const ref = useRef<HTMLDivElement>(null);
  // The pause belongs to one toast id. Clicking an action unmounts the toast
  // before mouseleave/blur can fire, so a plain boolean would stay stuck and
  // stop every later toast from auto-dismissing.
  const [pausedId, setPausedId] = useState<number | null>(null);
  const id = data?.id ?? null;
  const paused = id !== null && pausedId === id;
  const lift = useDrawerFootLift(open && id !== null);

  useEffect(() => {
    if (!flash || flash.id === seen.current) return;
    seen.current = flash.id;
    const snap = enquiryList.getSnapshot();
    const n = snap.items.length;
    const count = `${n} product${n === 1 ? "" : "s"}`;
    const viewList = { label: "View list", run: () => enquiryList.open() };
    // Lines already listed that took the packs a paste named.
    const note = flash.updated > 0 ? updatedNote(flash.updated) : "";
    const dupes = flash.duplicates > 0 ? ` (${flash.duplicates} already listed)` : "";
    if (flash.full && flash.keys.length === 0) {
      // Nothing fitted. Shown even inside the drawer: nothing else would change there.
      const msg = `Your list is full (${MAX_ITEMS} lines). Send this enquiry, then start another.${
        note ? ` ${note}.` : ""
      }`;
      toast.show(msg, snap.open ? undefined : [viewList]);
      announce(msg);
    } else if (flash.already) {
      if (!snap.open) toast.show(`${flash.name} is already in your list`, [viewList]);
      announce(`${flash.name} is already in your enquiry list.`);
    } else if (flash.keys.length === 0) {
      // Nothing new, but a paste changed packs on lines already listed (`name`
      // names those lines). No Undo: it would have nothing to remove. Inside the
      // drawer the packs change in place.
      if (!snap.open) toast.show(`${flash.name}: packs updated${dupes} · ${count}`, [viewList]);
      announce(`${flash.name}: packs updated${dupes}. ${count} in your enquiry list.`);
    } else {
      const { keys, replaced } = flash;
      // Some lines were added, the rest hit MAX_ITEMS.
      const cut = flash.full && flash.skipped > 0 ? flash.skipped : 0;
      const undo = {
        label: "Undo",
        run: () => {
          // Removes the added lines and restores any "to be advised" lines they
          // replaced, in one commit, so Undo never drops the product outright.
          enquiryList.undoAdd({ keys, replaced });
          const listed = new Set(enquiryList.getSnapshot().items.map((i) => i.key));
          const back = replaced.filter((r) => listed.has(r.line.key));
          announce(
            back.length === 0
              ? `${flash.name} removed from your enquiry list.`
              : back.length === 1
                ? `${flash.name} removed. ${back[0].line.name}, strength to be advised, is back in your enquiry list.`
                : `${flash.name} removed. ${back.length} "to be advised" lines are back in your enquiry list.`,
          );
        },
      };
      // Inside the drawer the new lines flash in place, so the toast only
      // appears there when some lines were cut, which the list can't show.
      if (!snap.open || cut) {
        toast.show(
          `${flash.name} added${dupes} · ${count}${note ? ` · ${note}` : ""}${cut ? ` · list full, ${cut} not added` : ""}`,
          snap.open ? [undo] : [viewList, undo],
        );
      }
      announce(
        `${flash.name} added${dupes}. ${count} in your enquiry list.${note ? ` ${note}.` : ""}${
          cut ? ` List full, ${cut} not added.` : ""
        }`,
      );
    }
    enquiryList.dismissFlash();
  }, [flash]);

  // Opening the drawer clears a toast that was already up; it would otherwise
  // sit over the drawer's footer. Toasts raised inside the drawer (remove ·
  // Undo) come later and are lifted clear of the footer instead.
  useEffect(() => {
    if (open) toast.dismiss();
  }, [open]);

  // A toast that replaces one the keyboard user is inside keeps the pause.
  useEffect(() => {
    if (id !== null && ref.current?.contains(document.activeElement)) setPausedId(id);
  }, [id]);

  useEffect(() => {
    if (!data || paused) return;
    const t = window.setTimeout(() => toast.dismiss(data.id), 5000);
    return () => window.clearTimeout(t);
  }, [data, paused]);

  return (
    <div data-keep-interactive>
      {data && (
        <div
          ref={ref}
          className="toast"
          style={lift === null ? undefined : { bottom: lift }}
          onMouseEnter={() => setPausedId(data.id)}
          onMouseLeave={() => setPausedId(null)}
          onFocus={() => setPausedId(data.id)}
          onBlur={() => setPausedId(null)}
        >
          <p className="toast-msg">{data.msg}</p>
          {data.actions?.map((a) => (
            <button
              key={a.label}
              type="button"
              className="toast-action"
              onClick={() => {
                setPausedId(null);
                a.run();
                toast.dismiss(data.id);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
