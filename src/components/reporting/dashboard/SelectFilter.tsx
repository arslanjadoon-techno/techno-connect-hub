type SelectFilterProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export default function SelectFilter({
  label,
  value,
  options,
  onChange,
}: SelectFilterProps) {
  return (
    <label className="block rounded-[6px] border border-[#7600bc] bg-white p-3">
      <span className="mb-2 block text-[10px] font-semibold text-[#4a4250]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-full bg-white text-[10px] text-[#5d5362] outline-none"
      >
        <option value="All">All</option>
        {options.map((option, index) => (
          <option key={`${option}-${index}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
