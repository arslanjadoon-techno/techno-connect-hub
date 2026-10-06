interface LoadingRowsProps {
  count?: number;
}

export default function LoadingRows({ count = 6 }: LoadingRowsProps) {
  return Array.from({ length: count }).map((_, index) => (
    <div key={index} className="mb-1 flex items-center gap-3 px-2 py-2.5">
      <div className="h-[42px] w-[42px] shrink-0 animate-pulse rounded-full bg-on-surface/10" />
      <div className="flex-1">
        <div className="h-4 w-[55%] animate-pulse rounded bg-on-surface/10" />
      </div>
    </div>
  ));
}
