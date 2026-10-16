import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBoxProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export default function SearchBox({ searchTerm, setSearchTerm }: SearchBoxProps) {
  return (
    <div className="bg-background px-3 py-2.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          role="searchbox"
          aria-label="Search chats"
          placeholder="Search chats"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && searchTerm) {
              event.preventDefault();
              setSearchTerm("");
            }
          }}
          className="h-10 rounded-lg border-transparent bg-muted/60 pl-9 pr-9 font-normal shadow-none focus-visible:bg-background"
        />
        {searchTerm && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}