import { MessageCircle } from "lucide-react";

type PinglyMarkProps = {
  size?: number;
};

export default function PinglyMark({ size = 34 }: PinglyMarkProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className="grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
        style={{ width: size, height: size }}
      >
        <MessageCircle style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }} />
      </div>
    </div>
  );
}
