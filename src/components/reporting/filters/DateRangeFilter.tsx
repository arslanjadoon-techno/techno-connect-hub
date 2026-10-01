type DateRangeFilterProps = {
  label: string;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

export default function DateRangeFilter({
  label,
  start,
  end,
  onStartChange,
  onEndChange,
}: DateRangeFilterProps) {
  return (
    <div className="rounded-[6px] border border-[#7600bc] bg-white p-3">
      <div className="mb-2 text-[10px] font-semibold text-[#4a4250]">{label}</div>
      <div className="grid gap-2 text-[9px] text-[#5d5362]">
        <input
          type="date"
          value={start}
          onChange={(event) => onStartChange(event.target.value)}
          className="h-7 min-w-0 w-full rounded-sm border border-[#7600bc] px-1 outline-none"
        />
        <input
          type="date"
          value={end}
          onChange={(event) => onEndChange(event.target.value)}
          className="h-7 min-w-0 w-full rounded-sm border border-[#7600bc] px-1 outline-none"
        />
      </div>
    </div>
  );
}
