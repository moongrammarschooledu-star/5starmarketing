"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, List, Map as MapIcon, Columns2, X } from "lucide-react";
import clsx from "clsx";
import type { Property } from "@/lib/models/property";
import type { PropertySearchFilters, PropertySearchResult, PropertySortKey } from "@/lib/models/propertySearch";
import { parsePropertySearchParams, buildPropertySearchQuery } from "@/lib/propertySearchParams";
import { getOrCreateSessionId } from "@/lib/session";
import { getAttribution } from "@/lib/attribution";
import { recordSearchEventAction } from "@/lib/actions/propertySearch.actions";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertySearchBar } from "./PropertySearchBar";
import { PropertyFilterFields } from "./PropertyFilterFields";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { PropertySortSelect } from "./PropertySortSelect";
import { PropertyPagination } from "./PropertyPagination";
import { PropertyResultsSkeleton } from "./SearchLoadingState";
import { SearchEmptyState, SearchErrorState } from "./SearchEmptyState";
import { PropertyMapLoader } from "./PropertyMapLoader";
import { SaveSearchButton } from "./SaveSearchButton";

type ViewMode = "list" | "map" | "split";

export function PropertySearchExperience({
  initialResult,
  mapProperties,
  cityOptions,
  amenityOptions,
  projects,
  isLoggedIn,
  businessCenter,
}: {
  initialResult: PropertySearchResult;
  mapProperties: Property[];
  cityOptions: string[];
  amenityOptions: string[];
  projects: { id: string; name: string }[];
  isLoggedIn: boolean;
  businessCenter?: { latitude: number; longitude: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = parsePropertySearchParams(Object.fromEntries(searchParams.entries()));
  const view = ((searchParams.get("view") as ViewMode) || "list") as ViewMode;

  const [pendingFilters, setPendingFilters] = useState<PropertySearchFilters>(filters);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [hasError, setHasError] = useState(false);
  const [mapBounds, setMapBounds] = useState<PropertySearchFilters["bounds"]>(filters.bounds);
  const [flyTarget, setFlyTarget] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  useEffect(() => setPendingFilters(filters), [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(next: PropertySearchFilters, opts?: { view?: ViewMode; resetPage?: boolean }) {
    const merged: PropertySearchFilters = { ...next, page: opts?.resetPage ? undefined : next.page };
    const params = buildPropertySearchQuery(merged);
    const nextView = opts?.view ?? view;
    if (nextView !== "list") params.set("view", nextView);
    setHasError(false);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  // Fires exactly once per distinct filter combination (page/bounds
  // excluded — those aren't "a new search", they're pagination/panning).
  const lastLoggedRef = useRef<string>("");
  useEffect(() => {
    const { page: _page, bounds: _bounds, ...significant } = filters;
    void _page;
    void _bounds;
    const key = JSON.stringify(significant);
    if (lastLoggedRef.current === key) return;
    lastLoggedRef.current = key;
    const attribution = getAttribution();
    recordSearchEventAction("property_search", {
      query: filters.q,
      filters,
      sessionId: getOrCreateSessionId(),
    }).catch(() => {});
    void attribution;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  function handleSearch(q: string) {
    navigate({ ...filters, q: q || undefined }, { resetPage: true });
  }

  function handleFilterFieldsChange(next: PropertySearchFilters) {
    setPendingFilters(next);
  }

  function applyPendingFilters() {
    navigate(pendingFilters, { resetPage: true });
    setFilterPanelOpen(false);
    recordSearchEventAction("filter_applied", { filters: pendingFilters, sessionId: getOrCreateSessionId() }).catch(() => {});
  }

  function handleChipsChange(next: PropertySearchFilters) {
    navigate(next, { resetPage: true });
    recordSearchEventAction("filter_removed", { filters: next, sessionId: getOrCreateSessionId() }).catch(() => {});
  }

  function handleClearAll() {
    navigate({}, { resetPage: true });
    setPendingFilters({});
  }

  function handleSortChange(sort: PropertySortKey) {
    navigate({ ...filters, sort }, { resetPage: true });
    recordSearchEventAction("sort_changed", { filters: { ...filters, sort }, sessionId: getOrCreateSessionId() }).catch(() => {});
  }

  function handlePageChange(page: number) {
    navigate({ ...filters, page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleViewChange(next: ViewMode) {
    navigate(filters, { view: next });
    if (next !== "list") {
      recordSearchEventAction("map_opened", { filters, sessionId: getOrCreateSessionId() }).catch(() => {});
    }
  }

  function handleSearchThisArea() {
    if (!mapBounds) return;
    navigate({ ...filters, bounds: mapBounds }, { resetPage: true });
    recordSearchEventAction("search_area_clicked", { filters: { ...filters, bounds: mapBounds }, sessionId: getOrCreateSessionId() }).catch(() => {});
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && !["page", "pageSize", "sort", "bounds"].includes(k) && !(Array.isArray(v) && v.length === 0)
  ).length;

  const result = initialResult;
  const showMap = view === "map" || view === "split";
  const showList = view === "list" || view === "split";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PropertySearchBar value={filters.q ?? ""} onSearch={handleSearch} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterPanelOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterPanelOpen && (
              <div className="fixed inset-0 z-50 lg:absolute lg:inset-auto lg:right-0 lg:top-full lg:z-40 lg:mt-2 lg:w-[420px]">
                <div className="absolute inset-0 bg-ink/60 lg:hidden" onClick={() => setFilterPanelOpen(false)} aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl lg:static lg:max-h-[70vh] lg:rounded-2xl lg:border lg:border-border lg:shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-heading text-base font-bold text-ink">Filters</h2>
                    <button type="button" onClick={() => setFilterPanelOpen(false)} aria-label="Close filters">
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <PropertyFilterFields
                    value={pendingFilters}
                    onChange={handleFilterFieldsChange}
                    cityOptions={cityOptions}
                    amenityOptions={amenityOptions}
                    projects={projects}
                  />
                  <div className="sticky bottom-0 mt-5 flex gap-2.5 bg-surface pt-3">
                    <button
                      type="button"
                      onClick={() => setPendingFilters({})}
                      className="flex-1 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
                    >
                      Clear All
                    </button>
                    <button type="button" onClick={applyPendingFilters} className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <SaveSearchButton isLoggedIn={isLoggedIn} filters={filters} />
        </div>
      </div>

      <div className="mt-4">
        <ActiveFilterChips filters={filters} onChange={handleChipsChange} onClearAll={handleClearAll} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm font-semibold text-ink" role="status" aria-live="polite">
          {result.total.toLocaleString()} {result.total === 1 ? "Property" : "Properties"} Found
        </p>
        <div className="flex items-center gap-2.5">
          <PropertySortSelect value={filters.sort ?? "newest"} onChange={handleSortChange} />
          <div className="flex rounded-full border border-border p-1">
            <ViewButton icon={List} active={view === "list"} label="List" onClick={() => handleViewChange("list")} />
            <ViewButton icon={MapIcon} active={view === "map"} label="Map" onClick={() => handleViewChange("map")} />
            <ViewButton icon={Columns2} active={view === "split"} label="Split" onClick={() => handleViewChange("split")} className="hidden lg:flex" />
          </div>
        </div>
      </div>

      <div className={clsx("mt-6", view === "split" && "grid grid-cols-1 gap-6 lg:grid-cols-2")}>
        {showList && (
          <div>
            {isPending ? (
              <PropertyResultsSkeleton />
            ) : hasError ? (
              <SearchErrorState onRetry={() => router.refresh()} />
            ) : result.properties.length === 0 ? (
              <SearchEmptyState onClearAll={handleClearAll} onBrowseAll={handleClearAll} />
            ) : (
              <>
                <div className={clsx("grid grid-cols-1 gap-6", view === "split" ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
                  {result.properties.map((p) => (
                    <PropertyCard
                      key={p.id}
                      property={p}
                      searchContext
                      selected={p.id === selectedId}
                      onMouseEnter={() => setSelectedId(p.id)}
                      onMouseLeave={() => setSelectedId(undefined)}
                    />
                  ))}
                </div>
                <PropertyPagination page={result.page} totalPages={result.totalPages} onChange={handlePageChange} />
              </>
            )}
          </div>
        )}

        {showMap && (
          <div className={clsx("overflow-hidden rounded-2xl border border-border", view === "split" ? "h-[600px] lg:sticky lg:top-24" : "h-[70vh]")}>
            <PropertyMapLoader
              properties={mapProperties}
              selectedId={selectedId}
              onSelectProperty={(id) => {
                setSelectedId(id);
                recordSearchEventAction("map_marker_clicked", { propertyId: id, sessionId: getOrCreateSessionId() }).catch(() => {});
              }}
              center={businessCenter}
              flyTarget={flyTarget}
              onBoundsChanged={(b) => setMapBounds(b)}
              showSearchThisArea
              onSearchThisArea={handleSearchThisArea}
              onLocationFound={(lat, lng) => setFlyTarget({ latitude: lat, longitude: lng })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ViewButton({
  icon: Icon,
  active,
  label,
  onClick,
  className,
}: {
  icon: typeof List;
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
