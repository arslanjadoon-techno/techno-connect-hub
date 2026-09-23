import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

const ALLOWED_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

interface BulkUploadCardProps {
  title: string;
  /** Extra form controls (month/year selects, section select, etc.) rendered next to the file picker. */
  controls?: ReactNode;
  /** Extra action rendered after the Upload button (e.g. a "Download Template" button). */
  extraAction?: ReactNode;
  canUpload: boolean;
  onUpload: (file: File) => Promise<Record<string, string>>;
}

export default function BulkUploadCard({ title, controls, extraAction, canUpload, onUpload }: BulkUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [results, setResults] = useState<Array<[string, string]>>([]);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFile(null);
      setMessage({ text: "Please upload a valid Excel file", ok: false });
      return;
    }
    setFile(selected);
    setResults([]);
    setMessage(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ text: "Please select a file first", ok: false });
      return;
    }
    if (!canUpload) {
      setMessage({ text: "Please fill in the required fields above", ok: false });
      return;
    }

    setProcessing(true);
    setMessage(null);
    setResults([]);
    try {
      const data = await onUpload(file);
      setResults(Object.entries(data));
      setMessage({ text: "Excel file uploaded successfully!", ok: true });
    } catch (error) {
      setMessage({ text: (error as Error).message || "Error uploading file", ok: false });
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <Card className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-3 p-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Processing, please wait...</p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="font-display text-xl font-semibold">{title}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-11 min-w-[180px] cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-4 text-sm hover:bg-accent">
          <Upload className="h-4 w-4" />
          {file ? "Change File" : "Select File"}
          <input type="file" accept=".xls,.xlsx" hidden onChange={handleFileChange} />
        </label>
        {file && <span className="max-w-[200px] truncate text-sm text-muted-foreground">{file.name}</span>}
        {controls}
        <Button className="h-11 px-6" onClick={handleUpload}>Upload</Button>
        {extraAction}
      </div>

      {message && (
        <p className={`text-sm font-medium ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      {results.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tech ID</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map(([key, value]) => (
                <tr key={key} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{key}</td>
                  <td className="px-3 py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Card>
  );
}
