import { Construction } from "lucide-react";

export default function ComingSoon({ title = "Dashboard" }: { title?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-primary-foreground shadow-md"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <Construction className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We are working on it. This module will be implemented soon — stay tuned.
        </p>
      </div>
    </div>
  );
}
