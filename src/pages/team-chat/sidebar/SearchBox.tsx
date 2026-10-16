import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBoxProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export default function SearchBox({ searchTerm, setSearchTerm }: SearchBoxProps) {
  return (
    <div className="bg-background px-3 py-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search chats"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 rounded-lg bg-background pl-9"
        />
      </div>
    </div>
  );
}
