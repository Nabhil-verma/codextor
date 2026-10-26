import { useEffect, useState } from "react";
import { useMutation, useQuery } from "../lib/cloud";
import { api } from "../lib/api";
import { useAccount } from "../AccountProvider";
import { atlasStoreFor, mergeAtlasState } from "../lib/atlasStore";
import { useLocalStore } from "../lib/localStore";
import { PanelBoundary } from "./gamification/Pieces";

function Bridge({ handle }: { handle: string }) {
  const cloud = useQuery(api.atlas.get);
  const save = useMutation(api.atlas.save);
  const store = atlasStoreFor(handle);
  const local = useLocalStore(store);
  const [state, setState] = useState("Loading account plan…");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!cloud) return;
    let active = true;
    // Let the page subscribe before applying the first account snapshot.
    queueMicrotask(() => {
      if (!active) return;
      const merged = mergeAtlasState(store.get(), cloud);
      if (JSON.stringify(merged) !== JSON.stringify(store.get())) store.set(merged);
    });
    return () => { active = false; };
  }, [cloud, store]);

  useEffect(() => {
    if (!cloud) return;
    const next = mergeAtlasState(store.get(), cloud);
    if (JSON.stringify(next) === JSON.stringify(cloud)) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setState("Syncing plan…");
      const answers = Object.fromEntries(Object.entries(next.answers).filter((entry): entry is [string, string] => entry[1] !== undefined));
      void save({ answers, revision: next.revision }).then(() => {
        if (active) setState("Plan synced to your account.");
      }).catch(() => {
        if (active) setState("Could not sync. Your plan is saved on this device.");
      });
    }, 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [cloud, local, save, store, retry]);

  return <p role="status" className="mt-3 text-sm text-ink-600">
    {cloud && JSON.stringify(local) === JSON.stringify(cloud) ? "Plan synced to your account." : state}
    {state.startsWith("Could not") && <button type="button" className="ml-2 underline" onClick={() => setRetry((n) => n + 1)}>Try again</button>}
  </p>;
}

export default function AtlasBridge() {
  const { user } = useAccount();
  if (!user) return <p className="mt-3 text-sm text-ink-600">Plan saved on this device. Sign in to sync.</p>;
  return (
    <PanelBoundary key={user.handle} fallback={(_, reset) => <p role="status" className="mt-3 text-sm text-ink-600">
      Account sync is unavailable. Your plan is saved on this device.{" "}
      <button type="button" className="underline" onClick={reset}>Try again</button>
    </p>}>
      <Bridge handle={user.handle} />
    </PanelBoundary>
  );
}
