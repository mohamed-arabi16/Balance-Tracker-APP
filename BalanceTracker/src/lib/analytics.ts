// TODO: Plan 08+ will implement RN-compatible analytics
// This placeholder prevents import errors in the ported hooks
export const trackEvent = (_event: string, _properties?: Record<string, unknown>) => {
  // no-op in RN app — analytics will be implemented in a later phase
};
