interface AdminPageProps {
  embedded?: boolean;
}

export default function AdminPage({ embedded = false }: AdminPageProps) {
  return (
    <section
      className={`${embedded ? "h-full" : "min-h-screen"} flex items-center justify-center bg-background p-6`}
    >
      <div className="max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Team Chat Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administration tools are not available in this build yet.
        </p>
      </div>
    </section>
  );
}
