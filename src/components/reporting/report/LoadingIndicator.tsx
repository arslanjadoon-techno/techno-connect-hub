type LoadingIndicatorProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  layout?: "inline" | "center";
};

const sizeClasses = {
  sm: {
    ring: "h-4 w-4 border-2",
    dot: "h-1 w-1",
    text: "text-[11px]",
  },
  md: {
    ring: "h-6 w-6 border-[3px]",
    dot: "h-1.5 w-1.5",
    text: "text-xs",
  },
  lg: {
    ring: "h-9 w-9 border-4",
    dot: "h-2 w-2",
    text: "text-sm",
  },
};

export default function LoadingIndicator({
  label = "Loading",
  size = "md",
  layout = "inline",
}: LoadingIndicatorProps) {
  const classes = sizeClasses[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        layout === "center"
          ? "flex h-full min-h-[120px] flex-col items-center justify-center gap-3"
          : "inline-flex items-center gap-2"
      } text-[#7600bc]`}
    >
      <span className="relative inline-flex items-center justify-center">
        <span
          className={`${classes.ring} animate-spin rounded-full border-[#eadcf2] border-t-[#7600bc]`}
        />
        <span className="absolute flex items-center gap-0.5">
          <span
            className={`${classes.dot} animate-pulse rounded-full bg-[#7600bc]`}
          />
          <span
            className={`${classes.dot} animate-pulse rounded-full bg-[#c7116a] [animation-delay:120ms]`}
          />
        </span>
      </span>

      <span className={`${classes.text} font-bold text-[#5e4c69]`}>
        {label}
      </span>
    </div>
  );
}
