import { join } from "node:path";

/** Where the global setup writes the Node worker bundle for the JS sandbox. */
export const JS_WORKER_BUNDLE = join(process.cwd(), "node_modules/.cache/codextor/js-worker-node.mjs");
