// Polyfill for Object.hasOwn (ES2022) - for older browser compatibility
if (!Object.hasOwn) {
  Object.hasOwn = function(obj: object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

// Initialize Sentry error monitoring
// Note: May have connectivity issues from China mainland
Sentry.init({
  dsn: "https://7ab32a41817569cd7cb0d7b12390be2a@o4510717214588928.ingest.us.sentry.io/4510717335764992",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  sendDefaultPii: true,
  tracesSampleRate: 0.1,
  // Reduce timeout to prevent blocking
  transportOptions: {
    fetchOptions: {
      keepalive: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(<App />);
