import type { Plugin } from "vite";
export function compilerAsset(): Promise<{ name: string; source: string }>;
export function compilerAssetPlugin(): Plugin;
