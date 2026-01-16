import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

// Initialize Sentry error monitoring
Sentry.init({
  dsn: "https://7ab32a41817569cd7cb0d7b12390be2a@o4510717214588928.ingest.us.sentry.io/4510717335764992",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // Only enable in production
  sendDefaultPii: true,
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
});

createRoot(document.getElementById("root")!).render(<App />);
