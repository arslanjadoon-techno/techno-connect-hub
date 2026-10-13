type ChatTimingFields = Record<string, string | number | boolean | null | undefined>;

/** Development-only sender timings. Never logs message text or authentication data. */
export const logChatTiming = (
  event: string,
  fields: ChatTimingFields = {},
): void => {
  if (!import.meta.env.DEV) return;

  console.debug("[Pingly chat timing]", {
    event,
    at: new Date().toISOString(),
    ...fields,
  });
};
