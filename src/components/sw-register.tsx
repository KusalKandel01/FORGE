"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker. Silent no-op when unavailable.
 * When a freshly deployed service worker takes control mid session
 * (skipWaiting + clients.claim in sw.js), reload once so the user lands
 * on the new bundle instead of a stale cached one. The sessionStorage
 * guard makes the reload strictly once per tab session.
 *
 * In development the worker is unregistered and its caches are wiped:
 * dev chunks change on every save, and a cache-first worker would serve
 * stale mixed bundles that crash the app in confusing ways.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      // Dev mode: drop any worker + caches so code is always fresh.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) =>
          Promise.all(regs.map((reg) => reg.unregister()))
        )
        .catch(() => {});
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
          )
          .catch(() => {});
      }
      return;
    }

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
