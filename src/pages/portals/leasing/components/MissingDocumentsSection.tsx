import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { leasingService } from "@/services/portals/leasing";

const DOCUMENT_OPTIONS = [
  "Master lease",
  "Amendment",
  "Extension/Renewal -1",
  "Extension/R-2",
  "Extension/R-3",
  "Extension/R-4",
  "Extension/R-5",
  "Assignment",
  "Renewed Lease",
  "Sub-Lease",
  "Guaranty",
];

export default function MissingDocumentsSection({ techId }: { techId: string }) {
  const [fields, setFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await leasingService.getMissingDocsList(techId);
        if (active) setFields(data);
      } catch (error) {
        console.error("Error loading missing documents:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [techId]);

  const addField = () => {
    if (fields.length === 0 || fields[fields.length - 1] !== "") {
      setFields((prev) => [...prev, ""]);
    }
  };

  const deleteField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, value: string) => {
    setFields((prev) => prev.map((f, i) => (i === index ? value : f)));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const missingDocs = fields.filter((f) => f !== "");
      await leasingService.addMissingDocsList({ techId, missingDocs });
      setFields(missingDocs);
      toast.success("Missing documents list saved.");
    } catch (error) {
      toast.error(`Failed to save: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-base font-bold">Missing Documents</h2>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">No missing documents recorded.</p>
          )}

          {fields.map((field, index) =>
            field === "" ? (
              <div key={index} className="flex items-center gap-1">
                <Select value={field} onValueChange={(v) => handleChange(index, v)}>
                  <SelectTrigger className="h-9 w-56">
                    <SelectValue placeholder="Select missing document" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 text-destructive"
                  onClick={() => deleteField(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Badge key={index} variant="outline" className="gap-1.5 py-1.5">
                {field}
                <button
                  type="button"
                  onClick={() => deleteField(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ),
          )}

          <div className="flex w-full gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={addField}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Another
            </Button>
            <Button size="sm" onClick={saveChanges} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
