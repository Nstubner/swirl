import { createContext, useContext } from 'react';

export type ExplainFn = (key: string, ctx?: Record<string, unknown>) => void;

export const ExplainContext = createContext<ExplainFn | null>(null);

/** Opens the "what does this mean?" sheet. No-op outside the provider. */
export function useExplain(): ExplainFn {
  return useContext(ExplainContext) ?? (() => {});
}
