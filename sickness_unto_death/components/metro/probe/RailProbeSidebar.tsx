"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/retroui/Button";
import { Menu } from "@/components/retroui/Menu";
import { GROUP_LABELS, normalizeSearch, routeTextColor, type RailCatalog, type RailGroup, type RailSelection, type ExplorerRoute } from "@/lib/rail-explorer/catalog";
import styles from "./RailProbe.module.css";
import StationAnimation from "./StationAnimation";

type Props = {
  catalog: RailCatalog | null; selection: RailSelection; isolated: boolean;
  loading: boolean; errors: string[]; onRetry: () => void;
  onSelect: (selection: NonNullable<RailSelection>) => void;
  onClear: () => void; onIsolate: () => void; onClose: () => void;
};

function RouteBadge({ route }: { route: ExplorerRoute }) {
  return <span className={`${styles.badge} ${route.group === "lightRail" ? styles.squareBadge : route.group === "heavyRail" || route.group === "existingMetro" ? styles.circleBadge : ""}`} style={{ background: route.color, color: routeTextColor(route.color) }}>{route.code}</span>;
}

export default function RailProbeSidebar({ catalog, selection, isolated, loading, errors, onRetry, onSelect, onClear, onIsolate }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<RailGroup | "all">("all");
  useEffect(() => { setQuery(""); }, [selection?.kind, selection?.id]);
  const stationMap = useMemo(() => new Map(catalog?.stations.map((station) => [station.id, station])), [catalog]);
  const routeMap = useMemo(() => new Map(catalog?.routes.map((route) => [route.id, route])), [catalog]);
  const route = selection?.kind === "route" ? routeMap.get(selection.id) : undefined;
  const station = selection?.kind === "station" ? stationMap.get(selection.id) : undefined;
  const needle = normalizeSearch(query);
  const routes = catalog?.routes.filter((r) => (group === "all" || r.group === group) && (!needle || normalizeSearch(`${r.code} ${r.name} ${GROUP_LABELS[r.group]}`).includes(needle))) ?? [];
  const stations = needle ? catalog?.stations.filter((s) => (group === "all" || s.groups.includes(group)) && s.aliases.some((name) => normalizeSearch(name).includes(needle))) ?? [] : [];
  const select = (next: NonNullable<RailSelection>) => { setQuery(""); onSelect(next); };

  return (
    <aside id="rail-probe-sidebar" className={styles.sidebar} aria-label="Probe into the niceties">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>High fidelity landing probe for spatial data</span><h2>Probe into the niceties</h2></div>
      </header>
      <div className={styles.scroll}>
        <label className={styles.search}><Search size={17} aria-hidden="true" /><input type="search" aria-label="Search stations or lines" placeholder="Search stations or lines…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {loading && <p role="status" className={styles.note}>Loading routes and stations…</p>}
        {errors.length > 0 && <div className={styles.error} role="alert"><p>Could not load: {errors.join(", ")}. Available networks are shown below.</p><Button size="sm" type="button" onClick={onRetry}>Retry</Button></div>}

        {selection && <div className={styles.selectionControls}>
          {(route || isolated) && !needle && <Button size="sm" type="button" aria-pressed={isolated} onClick={onIsolate}>
            {isolated ? "Show all lines" : "Show only this line"}
          </Button>}
          <Button size="sm" type="button" onClick={onClear}>Return to all routes</Button>
        </div>}

        {needle ? <section aria-label="Search results">
          <p className={styles.sectionHeading} role="status">{routes.length} lines · {stations.length} stations</p>
          {routes.slice(0, 15).map((r) => <button className={styles.routeCard} type="button" key={r.id} onClick={() => select({ kind: "route", id: r.id })}><RouteBadge route={r} /><span>{r.name}<small>{GROUP_LABELS[r.group]}</small></span></button>)}
          {stations.slice(0, 35).map((s) => <button className={styles.result} type="button" key={s.id} onClick={() => select({ kind: "station", id: s.id })}>{s.name}<small>{s.groups.map((g) => GROUP_LABELS[g]).join(" / ")} · {s.routes.map((id) => routeMap.get(id)?.code).filter(Boolean).join(" / ")}</small></button>)}
          {routes.length > 15 || stations.length > 35 ? <p className={styles.note}>Refine your search to see more specific matches.</p> : null}
          {!loading && !routes.length && !stations.length && <p className={styles.note}>No matches. Try a station name, street, or route code.</p>}
        </section> : station ? <section className={styles.station} aria-label="Selected station" aria-live="polite">
          <span className={styles.eyebrow}>{station.groups.map((g) => GROUP_LABELS[g]).join(" / ")}</span>
          <h3>{station.name}</h3>
          <Button size="sm" type="button" onClick={() => onSelect({ kind: "station", id: station.id })}>Center on station</Button>
          <h4>Lines serving this station</h4>
          <div className={styles.chips}>{station.routes.map((id) => { const r = routeMap.get(id); return r ? <button type="button" key={id} onClick={() => select({ kind: "route", id })} aria-label={`Explore ${r.name}`}><RouteBadge route={r} /></button> : null; })}</div>
          {!station.routes.length && <p className={styles.note}>No route membership is recorded for this station.</p>}
        </section> : route ? <section aria-label="Selected route">
          <div className={styles.routeSummary}><RouteBadge route={route} /><h3>{route.name}</h3><p>{GROUP_LABELS[route.group]} · {route.stationIds.length} stops</p></div>
          <Button size="sm" type="button" onClick={() => onSelect({ kind: "route", id: route.id })}>Fit entire line</Button>
          {route.branches.map((branch, index) => <div className={styles.stopList} key={index}>
            {route.branches.length > 1 && <h4>Branch / segment {index + 1}</h4>}
            <ol>{branch.map((id) => { const s = stationMap.get(id); return s ? <li key={id} style={{ borderColor: route.color }}><button type="button" onClick={() => select({ kind: "station", id })}>{s.name}{s.routes.length > 1 && <small>Connects to {s.routes.filter((r) => r !== route.id).map((r) => routeMap.get(r)?.code).join(" / ")}</small>}</button></li> : null; })}</ol>
          </div>)}
        </section> : <section aria-label="Route directory">
          <div className={styles.filter}>
            <span id="rail-network-label">Network</span>
            <Menu>
              <Menu.Trigger asChild>
                <Button size="sm" type="button" className={styles.filterTrigger} aria-labelledby="rail-network-label rail-network-value">
                  <span id="rail-network-value">{group === "all" ? "All networks" : GROUP_LABELS[group]}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </Button>
              </Menu.Trigger>
              <Menu.Content className={styles.filterMenu} sideOffset={6} collisionPadding={12}>
                {([{ value: "all", label: "All networks" }, ...Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label }))] as { value: RailGroup | "all"; label: string }[]).map(({ value, label }) => (
                  <Menu.Item key={value} className={styles.filterOption} role="menuitemradio" aria-checked={group === value} onSelect={() => setGroup(value)}>
                    <span className={styles.filterCheck}>{group === value && <StationAnimation size={20} />}</span>
                    {label}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu>
          </div>
          <p className={styles.sectionHeading}>{routes.length} lines · Select a line to explore</p>
          <p className={styles.note}>You can click on a route or station on the map.</p>
          {routes.map((r) => <button className={styles.routeCard} type="button" key={r.id} onClick={() => select({ kind: "route", id: r.id })}><RouteBadge route={r} /><span>{r.name}<small>{GROUP_LABELS[r.group]} · {r.stationIds.length} stops</small></span></button>)}
        </section>}
      </div>
    </aside>
  );
}
