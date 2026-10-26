"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Renders children only after mount. Use it around anything that reads
 *  persisted (localStorage) stores, so SSR markup always matches. */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  return <>{mounted ? children : fallback}</>;
}
