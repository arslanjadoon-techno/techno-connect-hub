import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type MarketStoreFilterProps = {
  markets: string[];
  storesByMarket: Record<string, string[]>;
  selectedMarkets: string[];
  selectedStores: string[];
  onMarketsChange: (markets: string[]) => void;
  onStoresChange: (stores: string[]) => void;
  onSelectionChange?: (markets: string[], stores: string[]) => void;
};

export default function MarketStoreFilter({
  markets,
  storesByMarket,
  selectedMarkets,
  selectedStores,
  onMarketsChange,
  onStoresChange,
  onSelectionChange,
}: MarketStoreFilterProps) {
  const [marketSearch, setMarketSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  const marketStoreSource = selectedMarkets.length > 0 ? selectedMarkets : markets;

  const storeOptions = useMemo(
    () =>
      Array.from(new Set(marketStoreSource.flatMap((market) => storesByMarket[market] ?? []))).sort(
        (storeA, storeB) => storeA.localeCompare(storeB),
      ),
    [marketStoreSource, storesByMarket],
  );

  const visibleMarkets = useMemo(
    () =>
      markets.filter((market) => {
        const searchText = marketSearch.toLowerCase();
        return market.toLowerCase().includes(searchText);
      }),
    [markets, marketSearch],
  );
  const visibleStores = useMemo(
    () => storeOptions.filter((store) => store.toLowerCase().includes(storeSearch.toLowerCase())),
    [storeSearch, storeOptions],
  );
  const visibleSelected =
    visibleMarkets.length > 0 && visibleMarkets.every((market) => selectedMarkets.includes(market));
  const visibleStoresSelected =
    visibleStores.length > 0 && visibleStores.every((store) => selectedStores.includes(store));

  function updateSelection(markets: string[], stores: string[]) {
    if (onSelectionChange) {
      onSelectionChange(markets, stores);
      return;
    }

    onMarketsChange(markets);
    onStoresChange(stores);
  }

  function getMarketStores(market: string) {
    return storesByMarket[market] ?? [];
  }

  function toggleMarketSelection(market: string) {
    if (selectedMarkets.includes(market)) {
      const nextMarkets = selectedMarkets.filter((item) => item !== market);
      const marketStores = getMarketStores(market);
      const nextStores = selectedStores.filter((store) => !marketStores.includes(store));

      updateSelection(nextMarkets, nextStores);
      return;
    }

    updateSelection([...selectedMarkets, market], selectedStores);
  }

  function toggleStoreSelection(store: string) {
    if (selectedStores.includes(store)) {
      updateSelection(
        selectedMarkets,
        selectedStores.filter((item) => item !== store),
      );
      return;
    }

    updateSelection(selectedMarkets, [...selectedStores, store]);
  }

  function toggleVisibleMarkets() {
    if (visibleSelected) {
      const nextMarkets = selectedMarkets.filter((market) => !visibleMarkets.includes(market));
      const visibleStores = visibleMarkets.flatMap(getMarketStores);
      const nextStores = selectedStores.filter((store) => !visibleStores.includes(store));

      updateSelection(nextMarkets, nextStores);
      return;
    }

    updateSelection(Array.from(new Set([...selectedMarkets, ...visibleMarkets])), selectedStores);
  }

  function toggleVisibleStores() {
    if (visibleStoresSelected) {
      updateSelection(
        selectedMarkets,
        selectedStores.filter((store) => !visibleStores.includes(store)),
      );
      return;
    }

    updateSelection(selectedMarkets, Array.from(new Set([...selectedStores, ...visibleStores])));
  }

  return (
    <div className="min-h-0 rounded-[6px] border border-[#7600bc] bg-white p-3">
      <div className="flex items-center justify-between text-[10px] font-semibold text-[#2d3033]">
        <span>Market</span>
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
          {selectedMarkets.length} selected
        </span>
      </div>
      <div className="mt-1 flex h-7 items-center gap-1 border-b border-[#7600bc] text-[#6a5a75]">
        <Search size={13} />
        <input
          type="search"
          value={marketSearch}
          onChange={(event) => setMarketSearch(event.target.value)}
          placeholder="Search markets"
          className="h-full min-w-0 flex-1 text-[10px] outline-none"
        />
      </div>
      <div className="mt-2 text-[11px] leading-[18px] text-[#302836]">
        <label className="flex cursor-pointer items-center gap-1 rounded-[4px] py-0.5 hover:text-[#7600bc]">
          <input
            type="checkbox"
            checked={visibleSelected}
            onChange={toggleVisibleMarkets}
            className="h-3 w-3 accent-[var(--primary)]"
          />
          Select all markets
        </label>
        <div className="mt-1 max-h-[190px] overflow-y-auto pr-1 lg:max-h-[260px]">
          {visibleMarkets.length === 0 ? (
            <div className="py-3 text-center text-[10px] text-[#6a5a75]">No matches</div>
          ) : null}
          {visibleMarkets.map((market, index) => (
            <label
              key={`${market}-${index}`}
              className="flex cursor-pointer items-center gap-1 rounded-[4px] py-0.5 hover:bg-[#faf5ff] hover:text-[#7600bc]"
            >
              <input
                type="checkbox"
                checked={selectedMarkets.includes(market)}
                onChange={() => toggleMarketSelection(market)}
                className="h-3 w-3 accent-[var(--primary)]"
              />
              <span className="truncate">{market}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 border-t border-[#eadcf2] pt-3">
        <div className="flex items-center justify-between text-[10px] font-semibold text-[#2d3033]">
          <span>Store</span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            {selectedStores.length} selected
          </span>
        </div>
        <div className="mt-1 flex h-7 items-center gap-1 border-b border-[#7600bc] text-[#6a5a75]">
          <Search size={13} />
          <input
            type="search"
            value={storeSearch}
            onChange={(event) => setStoreSearch(event.target.value)}
            placeholder="Search stores"
            className="h-full min-w-0 flex-1 text-[10px] outline-none"
          />
        </div>
        <div className="mt-2 text-[11px] leading-[18px] text-[#302836]">
          <label className="flex cursor-pointer items-center gap-1 rounded-[4px] py-0.5 hover:text-[#7600bc]">
            <input
              type="checkbox"
              checked={visibleStoresSelected}
              onChange={toggleVisibleStores}
              className="h-3 w-3 accent-[var(--primary)]"
            />
            Select all stores
          </label>
          <div className="mt-1 max-h-[220px] overflow-y-auto pr-1 lg:max-h-[320px]">
            {visibleStores.length === 0 ? (
              <div className="py-3 text-center text-[10px] text-[#6a5a75]">No matches</div>
            ) : null}
            {visibleStores.map((store, index) => (
              <label
                key={`${store}-${index}`}
                className="flex cursor-pointer items-center gap-1 rounded-[4px] py-0.5 hover:bg-[#faf5ff] hover:text-[#7600bc]"
              >
                <input
                  type="checkbox"
                  checked={selectedStores.includes(store)}
                  onChange={() => toggleStoreSelection(store)}
                  className="h-3 w-3 accent-[var(--primary)]"
                />
                <span className="truncate text-[#4f4654]">{store}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
