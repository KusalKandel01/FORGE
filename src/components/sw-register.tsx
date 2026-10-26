"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker. Silent no-op when unavailable.
 * When a freshly deployed service worker takes control mid session
 * (skipWaiting + clients.claim in sw.js), reload once so the user lands
 * on the new bundle instead of a stale cached one. The sessionStorage
 * guard makes the reload strictly once per tab session.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      if (sessionStorage.getItem("forge-sw-reloaded") === "1") return;
      sessionStorage.setItem("forge-sw-reloaded", "1");
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is best effort; never block the app.
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);
  return null;
}
