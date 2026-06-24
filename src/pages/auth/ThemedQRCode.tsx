import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders a Google Authenticator QR code locally in the app theme,
 * extracting the underlying `otpauth://` URI from a server-provided
 * external QR URL (e.g. api.qrserver.com?data=otpauth://...).
 *
 * This avoids the noisy external image and produces a crisp, themed QR.
 */
export default function ThemedQRCode({
  qrCodeUrl,
  otpauthUrl,
  size = 220,
  className = "",
}: {
  /** External QR provider URL whose `data` query param holds the otpauth URI. */
  qrCodeUrl?: string;
  /** Raw otpauth:// URI, takes precedence when provided. */
  otpauthUrl?: string;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve the raw otpauth:// payload.
  const payload = (() => {
    if (otpauthUrl) return otpauthUrl;
    if (!qrCodeUrl) return null;
    try {
      const u = new URL(qrCodeUrl);
      const data = u.searchParams.get("data");
      if (data) return data; // already decoded by URL API
      return qrCodeUrl;
    } catch {
      return qrCodeUrl;
    }
  })();

  useEffect(() => {
    if (!payload || !canvasRef.current) return;
    // Resolve theme-aware colors from CSS variables so the QR matches the
    // active palette (light/dark). Falls back to safe defaults.
    const styles = getComputedStyle(document.documentElement);
    const fg = styles.getPropertyValue("--foreground").trim() || "oklch(0.22 0.04 270)";
    QRCode.toCanvas(
      canvasRef.current,
      payload,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel: "M",
        color: {
          dark: cssColorToHex(fg) || "#1a1a2e",
          light: "#ffffff",
        },
      },
      (err) => {
        if (err) setError(err.message);
      },
    );
  }, [payload, size]);

  if (!payload) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-dashed bg-muted/40 text-xs text-muted-foreground ${className}`}
        style={{ width: size, height: size }}>
        QR unavailable
      </div>
    );
  }

  return (
    <div className={`relative inline-block rounded-2xl border bg-white p-3 shadow-sm ${className}`}>
      <canvas ref={canvasRef} width={size} height={size} className="block rounded-md" />
      {error && (
        <p className="mt-2 text-center text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}

/** Best-effort conversion: returns the input unchanged for canvas if it's a valid CSS color string. */
function cssColorToHex(color: string): string | null {
  if (!color) return null;
  // qrcode lib accepts hex only — convert via a temp canvas.
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000";
    ctx.fillStyle = color; // browser parses; if invalid, stays "#000000"
    const parsed = ctx.fillStyle as string;
    if (parsed.startsWith("#")) return parsed;
    // rgb(r,g,b) form
    const m = parsed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) {
      const toHex = (n: string) => Number(n).toString(16).padStart(2, "0");
      return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
    }
    return null;
  } catch {
    return null;
  }
}
