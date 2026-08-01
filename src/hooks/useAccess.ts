"use client";

import { useEffect, useState, useCallback } from "react";
import type { AccessTier } from "@/lib/access-tier";

export interface AccessState {
  tier: AccessTier;
  email: string | null;
  trialDaysLeft: number;
  trialAlreadyUsed: boolean;
  loading: boolean;
}

const DEFAULT_STATE: AccessState = {
  tier: "free",
  email: null,
  trialDaysLeft: 0,
  trialAlreadyUsed: false,
  loading: true,
};

/** Client-side access state, fetched once from /api/me. */
export function useAccess(): AccessState & { refresh: () => void } {
  const [state, setState] = useState<AccessState>(DEFAULT_STATE);

  const refresh = useCallback(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setState({
            tier: data.tier ?? "free",
            email: data.email ?? null,
            trialDaysLeft: data.trialDaysLeft ?? 0,
            trialAlreadyUsed: data.trialAlreadyUsed ?? false,
            loading: false,
          });
        } else {
          setState({ ...DEFAULT_STATE, loading: false });
        }
      })
      .catch(() => setState({ ...DEFAULT_STATE, loading: false }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
