import { useCallback } from "react";

type ChatRecord = Record<string, any>;

export function useChatConfirmation({
  confirmationResolverRef,
  setConfirmationDialog,
}: {
  confirmationResolverRef: { current: ((confirmed: boolean) => void) | null };
  setConfirmationDialog: (value: ChatRecord | null) => void;
}) {
  const requestConfirmation = useCallback(
    (options: ChatRecord): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        confirmationResolverRef.current = resolve;
        setConfirmationDialog({
          title: options?.title || "Please confirm",
          message: options?.message || "Are you sure you want to continue?",
          confirmLabel: options?.confirmLabel || "Confirm",
          confirmColor: options?.confirmColor || "error",
        });
      }),
    [confirmationResolverRef, setConfirmationDialog],
  );

  const closeConfirmation = (confirmed: boolean) => {
    confirmationResolverRef.current?.(confirmed);
    confirmationResolverRef.current = null;
    setConfirmationDialog(null);
  };

  return { closeConfirmation, requestConfirmation };
}
