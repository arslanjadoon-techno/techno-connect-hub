import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type FieldType = "text" | "date" | "select" | "textarea" | "email" | "number";

interface EditableFieldProps {
  label: string;
  value: string;
  displayValue?: string;
  editing: boolean;
  type?: FieldType;
  options?: string[];
  onChange?: (value: string) => void;
  badgeTone?: string;
  colSpan?: string;
}

const show = (v?: string | null) => (v && v.trim() !== "" ? v : "—");

export default function EditableField({
  label,
  value,
  displayValue,
  editing,
  type = "text",
  options,
  onChange,
  badgeTone,
  colSpan = "",
}: EditableFieldProps) {
  return (
    <div className={colSpan}>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      {editing && onChange ? (
        type === "select" ? (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {(options ?? []).map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === "textarea" ? (
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} />
        ) : (
          <Input type={type === "date" ? "date" : type === "email" ? "email" : type === "number" ? "number" : "text"} value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
        )
      ) : badgeTone ? (
        <Badge variant="outline" className={badgeTone}>{displayValue ?? show(value)}</Badge>
      ) : (
        <p className="text-sm">{displayValue ?? show(value)}</p>
      )}
    </div>
  );
}
