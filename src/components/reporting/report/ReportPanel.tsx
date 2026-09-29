export default function ReportPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`report-section min-w-0 max-w-full overflow-hidden rounded-[8px] border border-[#7600bc] ${className}`}>
      {title ? (
        <div className="px-3 pt-2 text-[12px] font-medium text-[#3f2354]">
          {title}
        </div>
      ) : null}
      {children}
    </section>
  );
}
