"use client";

import { useEffect } from "react";
import { refreshSession } from "@/lib/auth";

/** Mount once in the app layout to hydrate the client session store. */
export function SessionRefresh() {
  useEffect(() => {
    void refreshSession();
  }, []);
  return null;
}