/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as atlas from "../atlas.js";
import type * as auth from "../auth.js";
import type * as certificates from "../certificates.js";
import type * as clans from "../clans.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as preferences from "../preferences.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  atlas: typeof atlas;
  auth: typeof auth;
  certificates: typeof certificates;
  clans: typeof clans;
  http: typeof http;
  leaderboard: typeof leaderboard;
  preferences: typeof preferences;
  profiles: typeof profiles;
  progress: typeof progress;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
