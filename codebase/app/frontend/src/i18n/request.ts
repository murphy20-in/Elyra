import { getRequestConfig } from "next-intl/server";

import en from "./locales/en.json";

export default getRequestConfig(async () => ({
  locale: "en",
  messages: en,
}));
