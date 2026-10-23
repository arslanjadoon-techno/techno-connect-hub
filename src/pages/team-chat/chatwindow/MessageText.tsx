import { getBuddyName } from "../chatHealper";

type RecordValue = Record<string, any>;
const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const FORMAT_PATTERN = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;

export default function MessageText({
  text,
  mentionableUsers = [],
}: {
  text: string;
  mentionableUsers?: RecordValue[];
}) {
  const labels = mentionableUsers.map((user) => getBuddyName(user)).filter(Boolean);
  const escapedLabels = labels.map((label) => String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const mentionPattern = escapedLabels.length
    ? new RegExp("(@(?:" + escapedLabels.join("|") + "))(?=\\s|$|[.,!?;:])", "g")
    : null;
  return (
    <>
      {String(text || "")
        .split(FORMAT_PATTERN)
        .map((part, index) => {
          if (/^\*\*[^*\n]+\*\*$/.test(part) || /^__[^_\n]+__$/.test(part))
            return (
              <strong key={index}>
                <MessageText text={part.slice(2, -2)} mentionableUsers={mentionableUsers} />
              </strong>
            );
          if (/^\*[^*\n]+\*$/.test(part) || /^_[^_\n]+_$/.test(part))
            return (
              <em key={index}>
                <MessageText text={part.slice(1, -1)} mentionableUsers={mentionableUsers} />
              </em>
            );
          const formatted = mentionPattern ? part.split(mentionPattern) : [part];
          return formatted.flatMap((mentionPart, mentionIndex) =>
            mentionIndex % 2
              ? [
                  <span
                    key={`${index}-mention-${mentionIndex}`}
                    className="font-semibold text-primary"
                  >
                    {mentionPart}
                  </span>,
                ]
              : mentionPart.split(URL_PATTERN).map((urlPart, urlIndex) =>
                  urlIndex % 2 ? (
                    <a
                      key={`${index}-${urlIndex}`}
                      href={urlPart.startsWith("www.") ? `https://${urlPart}` : urlPart}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {urlPart}
                    </a>
                  ) : (
                    <span key={`${index}-${mentionIndex}-${urlIndex}`}>{urlPart}</span>
                  ),
                ),
          );
        })}
    </>
  );
}
