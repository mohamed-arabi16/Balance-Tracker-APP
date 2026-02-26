// TODO: Plan 08+ will implement RN-compatible activity logging
// This placeholder prevents import errors in the ported hooks
export const useLogActivity = () => {
  return (_activity: { type: string; action: string; description: string }) => {
    // no-op in RN app — activity logging will be implemented in a later phase
  };
};
