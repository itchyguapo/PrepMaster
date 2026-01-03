import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

declare const chrome: any;

// Suppress Chrome extension errors (harmless, caused by browser extensions)
if (typeof window !== "undefined") {
  // Suppress "Unchecked runtime.lastError" messages
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";
    // Filter out Chrome extension errors
    if (
      message.includes("Unchecked runtime.lastError") ||
      message.includes("message port closed") ||
      message.includes("Could not establish connection") ||
      message.includes("Receiving end does not exist")
    ) {
      // Silently ignore these extension errors
      return;
    }
    originalError.apply(console, args);
  };

  // Suppress unhandled promise rejections from extensions
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.message || String(event.reason || "");
    if (
      message.includes("message port closed") ||
      message.includes("Could not establish connection") ||
      message.includes("Receiving end does not exist") ||
      message.includes("runtime.lastError")
    ) {
      event.preventDefault(); // Suppress the error
    }
  });

  // Handle Chrome runtime errors if extension APIs are accessed
  if (typeof chrome !== "undefined" && chrome.runtime) {
    // Wrap chrome.runtime to catch errors gracefully
    const originalSendMessage = chrome.runtime.sendMessage;
    if (originalSendMessage) {
      // @ts-ignore
      chrome.runtime.sendMessage = function (...args: any[]) {
        try {
          return originalSendMessage.apply(this, args);
        } catch (error: any) {
          // Silently handle extension communication errors
          if (
            error?.message?.includes("message port closed") ||
            error?.message?.includes("Could not establish connection")
          ) {
            return;
          }
          throw error;
        }
      };
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
