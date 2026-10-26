import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "../lib/cloud";
import { api } from "../lib/api";
import { useAccount } from "../AccountProvider";
import { themeStyleStore, useThemeStyle, type ThemeStyle } from "../lib/theme";
import { PanelBoundary } from "./gamification/Pieces";

/* ═══════════════════════════════════════════════════════════════
   Mounted once at the app root. Mirrors the appearance style
   (glass ⇄ minimal) to the signed-in learner's account, so the
   choice follows them to another device instead of living only in
   this browser's localStorage.

   Policy, in one line: the account wins once its row is known; a
   browser that already had a choice seeds the account when the
   account has none; changes after that push as they happen. The
   local copy stays authoritative while signed out — the pre-paint
   script in index.html reads it before the app bundle exists.
   ═══════════════════════════════════════════════════════════════ */

function Bridge() {
  const { user } = useAccount();
  const cloud = useQuery(api.preferences.get);
  const save = useMutation(api.preferences.save);
  const { setStyle } = useThemeStyle();
  // The last value the account and this browser agreed on. Suppresses the
  // echo of our own write bouncing back through the reactive query.
  const agreed = useRef<ThemeStyle | null>(null);
  // The last cloud row this bridge processed. Each new one is applied once —
  // keyed by its serial, not by comparing against the live local value, so a
  // fresh local change is never reverted by a stale row while the write is
  // still in flight.
  const lastCloud = useRef("");

  // Pull (and seed): each account row is applied exactly once, in order.
  useEffect(() => {
    if (!user) {
      // Signed out: re-arm so the next sign-in re-reads the account's row.
      lastCloud.current = "";
      agreed.current = null;
      return;
    }
    if (cloud === undefined) return; // still loading
    const serial = JSON.stringify(cloud);
    if (serial === lastCloud.current) return;
    lastCloud.current = serial;

    const cloudStyle = cloud?.themeStyle ?? null;
    const local = themeStyleStore.get();
    if (cloudStyle === null) {
      // Fresh account: adopt whatever this browser had chosen, so the first
      // device to sign in defines the default instead of losing its choice.
      if (local) {
        agreed.current = local;
        void save({ themeStyle: local }).catch(() => {});
      }
      return;
    }
    agreed.current = cloudStyle;
    if (cloudStyle !== local) setStyle(cloudStyle);
  }, [user, cloud, save, setStyle]);

  // Push: choices made while signed in follow the account. Debounced like the
  // other account pushes, so flipping through styles writes once — and only the
  // final value can echo back, which is what keeps the pull above from ever
  // seeing an intermediate row. Held back while the row is loading — the
  // account wins that window, as it does on load.
  useEffect(() => {
    if (!user || cloud === undefined) return;
    let timer: number | undefined;
    const unsubscribe = themeStyleStore.subscribe(() => {
      const next = themeStyleStore.get();
      if (!next || next === agreed.current) return;
      agreed.current = next;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void save({ themeStyle: next }).catch(() => {
          // Offline or transient backend error — the local choice still holds.
        });
      }, 400);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [user, cloud, save]);

  return null;
}

export default function ThemeBridge() {
  return (
    <PanelBoundary fallback={null}>
      <Bridge />
    </PanelBoundary>
  );
}
