/*
 * Quality ladder for the Atlas map. Three views read the same plan data:
 *   3d       — the three.js atlas (needs WebGL and motion allowed)
 *   2.5d     — the flat, layered map (motion reduced, WebGL not needed)
 *   outline  — the list (always works, no WebGL, the accessible fallback)
 * The rule is fixed and runs without any network call.
 */
import { createLocalStore } from "./localStore";

export const VIEWS = ["3d", "2.5d", "outline"] as const;
export type ViewChoice = (typeof VIEWS)[number];

export type ViewCapabilities = {
  webgl: boolean;
  reducedMotion: boolean;
  lowPower?: boolean;
  /** An override cannot enable unsupported WebGL. */
  override?: ViewChoice;
};

export function chooseView(cap: ViewCapabilities): ViewChoice {
  if (cap.override) return cap.override === "3d" && !cap.webgl ? "outline" : cap.override;
  if (!cap.webgl) return "outline";
  if (cap.reducedMotion || cap.lowPower) return "2.5d";
  return "3d";
}

export const atlasViewStore = createLocalStore<ViewChoice | undefined>("clr-atlas-view-v1", (raw) => {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    return VIEWS.find((view) => view === value);
  } catch { return undefined; }
});

/** Three.js requires WebGL2. Release the probe context immediately. */
export function detectWebgl(doc: Document = document): boolean {
  try {
    if (typeof WebGL2RenderingContext === "undefined") return false;
    const canvas = doc.createElement("canvas");
    const context = canvas.getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
