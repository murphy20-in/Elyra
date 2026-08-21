/**
 * Adapter selection.
 *
 * The one place in the codebase that knows whether data is local or
 * remote. Everything above imports `adapter` and stays ignorant.
 */

import { DATA_MODE } from "../utils/config.js";
import localAdapter from "../adapters/local.adapter.js";
import apiAdapter from "../adapters/api.adapter.js";

export const adapter = DATA_MODE === "api" ? apiAdapter : localAdapter;

export const isLocalAdapter = adapter.MODE === "local";

export const {
  session, profile, candidates, likes, matches, conversations,
  messages, blocks, reports, safeDates, trustedContacts,
  settings, activity, data,
} = adapter;

export default adapter;
