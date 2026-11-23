import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { storesService, statesService, marketsService, districtsService } from "@/services";
import { useCanWrite } from "@/lib/leasing-permissions";
import { leasingService } from "@/services/portals/leasing/leasing.service";

interface State {
  id: number;
  name: string;
  symbol: string;
}

interface Market {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
}

// Add-Store permission key for this page (consistent with the other
// leasing.show_* page-gating keys in leasing-permissions.ts).
export const LEASING_ADD_STORE_PERMISSION_KEY = "leasing.show_add_store";

export default function AddStorePage() {
  const canWrite = useCanWrite(LEASING_ADD_STORE_PERMISSION_KEY);

  const [states, setStates] = useState<State[]>([]);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const statesLoadingRef = useRef(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [doorCode, setDoorCode] = useState("");

  const [stateId, setStateId] = useState<string>("");
  const [marketId, setMarketId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");

  const [markets, setMarkets] = useState<Market[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [stateSearch, setStateSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");

  const stateSearchRef = useRef<HTMLInputElement>(null);
  const marketSearchRef = useRef<HTMLInputElement>(null);
  const districtSearchRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  const ensureStatesLoaded = async () => {
    if (statesLoaded || statesLoadingRef.current) return;
    statesLoadingRef.current = true;
    try {
      const res = await statesService.getAll();
      if (res.success) {
        setStates(res.data);
        setStatesLoaded(true);
      }
    } catch (err) {
      console.error("Failed to load states:", err);
    } finally {
      statesLoadingRef.current = false;
    }
  };

  const handleStateChange = async (newStateId: string) => {
    setStateId(newStateId);
    setMarketId("");
    setDistrictId("");
    setMarkets([]);
    setDistricts([]);

    if (!newStateId) return;

    try {
      setMarketsLoading(true);
      const match = states.find((s) => s.id.toString() === newStateId);
      const stateParam = match ? match.name : newStateId;
      const res = await marketsService.getAll({ State: stateParam });
      if (res.success && Array.isArray(res.data)) {
        setMarkets(res.data);
      }
    } catch (err) {
      console.error("Failed to load markets for state", err);
    } finally {
      setMarketsLoading(false);
    }
  };

  const handleMarketChange = async (newMarketId: string) => {
    setMarketId(newMarketId);
    setDistrictId("");
    setDistricts([]);

    if (!newMarketId) return;

    try {
      setDistrictsLoading(true);
      const match = markets.find((m) => m.id.toString() === newMarketId);
      const marketParam = match ? match.name : newMarketId;
      const res = await districtsService.getAll({ Market: marketParam });
      if (res.success && Array.isArray(res.data)) {
        setDistricts(res.data);
      }
    } catch (err) {
      console.error("Failed to load districts for market", err);
    } finally {
      setDistrictsLoading(false);
    }
  };

  const filteredStates = useMemo(
    () => states.filter((s) => s.name.toLowerCase().includes(stateSearch.toLowerCase())),
    [states, stateSearch],
  );
  const filteredMarkets = useMemo(
    () => markets.filter((m) => m.name.toLowerCase().includes(marketSearch.toLowerCase())),
    [markets, marketSearch],
  );
  const filteredDistricts = useMemo(
    () => districts.filter((d) => d.name.toLowerCase().includes(districtSearch.toLowerCase())),
    [districts, districtSearch],
  );

  const isFormValid =
    Boolean(name.trim()) &&
    Boolean(address.trim()) &&
    Boolean(email.trim()) &&
    Boolean(stateId) &&
    Boolean(marketId) &&
    Boolean(districtId) &&
    !saving &&
    !marketsLoading &&
    !districtsLoading;

  const resetForm = () => {
    setName("");
    setAddress("");
    setEmail("");
    setPhone("");
    setDoorCode("");
    setStateId("");
    setMarketId("");
    setDistrictId("");
    setMarkets([]);
    setDistricts([]);
  };

  const handleSave = async () => {
    if (!isFormValid) return;
    try {
      setSaving(true);
      const res = await storesService.add({
        name: name.trim(),
        address: address.trim(),
        email: email.trim(),
        phone: phone.trim(),
        doorCode: doorCode.trim(),
        stateId: Number(stateId),
        marketId: Number(marketId),
        districtId: Number(districtId),
      });
      if (res.success) {
        const created = res.data;
        if (created?.techId) {
          try {
            await leasingService.addStoreInLeasingDB({
              techId: created.techId,
              storeName: created.name,
              marketName: created.market?.name,
            });
          } catch (leaseErr) {
            console.error("Store created, but failed to seed its lease record:", leaseErr);
            toast.error(
              "Store added, but it could not be added to Manage Leasing automatically - add it there manually.",
            );
          }
        }
        toast.success(res.message || "Store added successfully");
        resetForm();
      } else {
        toast.error(res.message || "Failed to create store");
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <StoreIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold">Add Store</h1>
          <p className="text-sm text-muted-foreground">
            Register a new store so it becomes available across the Leasing portal
          </p>
        </div>
      </div>

      <Card className="p-5 max-w-3xl space-y-4">
        {!canWrite && (
          <p className="text-sm text-muted-foreground">
            You have read-only access to this page and cannot add a store.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>
              Store Name <span className="text-destructive font-semibold">*</span>
            </Label>
            <Input
              value={name}
              disabled={saving || !canWrite}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Westside Retail Hub"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Door Code{" "}
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              value={doorCode}
              disabled={saving || !canWrite}
              onChange={(e) => setDoorCode(e.target.value)}
              placeholder="123456"
            />
          </div>
        </div>

        <div className="w-full space-y-1.5">
          <Label>
            Address <span className="text-destructive font-semibold">*</span>
          </Label>
          <Input
            value={address}
            disabled={saving || !canWrite}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Complete street address details"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>
              Email Contact <span className="text-destructive font-semibold">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              disabled={saving || !canWrite}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="store@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Phone Number{" "}
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              value={phone}
              disabled={saving || !canWrite}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 23 456 865"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* State */}
          <div className="space-y-1.5">
            <Label>
              State <span className="text-destructive font-semibold">*</span>
            </Label>
            <Select
              value={stateId}
              disabled={saving || !canWrite}
              onValueChange={handleStateChange}
              onOpenChange={(open) => {
                if (open) {
                  ensureStatesLoaded();
                  setTimeout(() => stateSearchRef.current?.focus(), 100);
                } else {
                  setStateSearch("");
                }
              }}
            >
              <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                  <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                  <input
                    ref={stateSearchRef}
                    placeholder="Search states..."
                    value={stateSearch}
                    onChange={(e) => {
                      setStateSearch(e.target.value);
                      setTimeout(() => stateSearchRef.current?.focus(), 0);
                    }}
                    className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {filteredStates.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Market */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Market <span className="text-destructive font-semibold">*</span>
              </Label>
              {marketsLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>
            <Select
              value={marketId}
              disabled={saving || !canWrite || !stateId || marketsLoading}
              onValueChange={handleMarketChange}
              onOpenChange={(open) => {
                if (!open) setMarketSearch("");
                else setTimeout(() => marketSearchRef.current?.focus(), 100);
              }}
            >
              <SelectTrigger className="w-full bg-white dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed">
                <SelectValue
                  placeholder={
                    !stateId
                      ? "Select State First"
                      : marketsLoading
                        ? "Loading markets..."
                        : filteredMarkets.length === 0
                          ? "No markets available"
                          : "Select market"
                  }
                />
              </SelectTrigger>
              <SelectContent
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                  <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                  <input
                    ref={marketSearchRef}
                    placeholder="Search markets..."
                    value={marketSearch}
                    onChange={(e) => {
                      setMarketSearch(e.target.value);
                      setTimeout(() => marketSearchRef.current?.focus(), 0);
                    }}
                    className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {filteredMarkets.length === 0 ? (
                  <p className="text-[11px] text-center text-muted-foreground p-2">
                    {marketsLoading ? "Fetching records..." : "No markets found"}
                  </p>
                ) : (
                  filteredMarkets.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                District <span className="text-destructive font-semibold">*</span>
              </Label>
              {districtsLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>
            <Select
              value={districtId}
              disabled={saving || !canWrite || !marketId || districtsLoading}
              onValueChange={setDistrictId}
              onOpenChange={(open) => {
                if (!open) setDistrictSearch("");
                else setTimeout(() => districtSearchRef.current?.focus(), 100);
              }}
            >
              <SelectTrigger className="w-full bg-white dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed">
                <SelectValue
                  placeholder={
                    !marketId
                      ? "Select Market First"
                      : districtsLoading
                        ? "Loading districts..."
                        : filteredDistricts.length === 0
                          ? "No districts available"
                          : "Select district"
                  }
                />
              </SelectTrigger>
              <SelectContent
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                  <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                  <input
                    ref={districtSearchRef}
                    placeholder="Search districts..."
                    value={districtSearch}
                    onChange={(e) => {
                      setDistrictSearch(e.target.value);
                      setTimeout(() => districtSearchRef.current?.focus(), 0);
                    }}
                    className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {filteredDistricts.length === 0 ? (
                  <p className="text-[11px] text-center text-muted-foreground p-2">
                    {districtsLoading ? "Fetching records..." : "No districts found"}
                  </p>
                ) : (
                  filteredDistricts.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full flex items-center justify-center gap-2 sm:w-auto"
          disabled={!isFormValid || !canWrite}
          onClick={handleSave}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Store
        </Button>
      </Card>
    </div>
  );
}
