"""Build a self-contained, offline research report and SVG comparison."""
import html
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
esc = lambda value: html.escape(str(value), quote=True)
audit = json.loads((ROOT / "coverage-audit.json").read_text())
sources = json.loads((ROOT / "sources.json").read_text())["sources"]
layers = [
    ("early", "1915", "lary-1915-brooks-lutz.geojson"),
    ("later", "1930s (exact year uncertain)", "lary-1930s-brooks-lutz.geojson"),
]

def project(point):
    lon, lat = point
    return math.radians(lon), -math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

paths, points = {}, []
for key, label, filename in layers:
    paths[key] = []
    data = json.loads((ROOT / "geojson" / filename).read_text())
    for feature in data["features"]:
        geometry = feature["geometry"]
        lines = [geometry["coordinates"]] if geometry["type"] == "LineString" else geometry["coordinates"]
        for line in lines:
            projected = [project(p) for p in line]
            points.extend(projected)
            props = feature["properties"]
            title = " · ".join(str(props[k]) for k in ("Name", "Branch") if props.get(k))
            paths[key].append((title, projected))
x0, y0 = min(x for x, y in points), min(y for x, y in points)
span = max(max(x for x, y in points) - x0, max(y for x, y in points) - y0)
scale = 900 / span
groups = []
for key, label, filename in layers:
    content = []
    for title, line in paths[key]:
        d = "M" + " L".join(f"{50+(x-x0)*scale:.2f},{50+(y-y0)*scale:.2f}" for x, y in line)
        content.append(f'<path d="{d}"><title>{esc(label + ": " + title)}</title></path>')
    groups.append(f'<g id="{key}" fill="none" stroke-linecap="round" stroke-linejoin="round">' + "".join(content) + "</g>")
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-label="Comparison of 1915 and 1930s LARy source geometry"><style>#early{stroke:#1685b5;stroke-width:3}#later{stroke:#dc7524;stroke-width:2;stroke-dasharray:5 3}</style>' + "".join(groups) + '</svg>'
(ROOT / "comparison.svg").write_text(svg)

event_rows = "".join(f'<tr><td>{esc(e["date"])}</td><td><a href="{esc(e["source_url"])}">{esc(e["name"])}</a></td><td>{esc(e["why_it_matters"])}</td></tr>' for e in audit["events_to_reconcile"])
source_rows = "".join(f'<tr><td>{esc(s["period"])}</td><td><a href="{esc(s["url"])}">{esc(s["label"])}</a><small>{esc(s["status"])}</small></td><td>{esc(s["use"])}<small>{esc(s["limits"])}</small></td></tr>' for s in sources)
steps = "".join(f'<li>{esc(step)}</li>' for step in audit["merge_plan"])
downloads = "".join(f'<li><a href="geojson/{filename}">{esc(label)} GeoJSON</a></li>' for key, label, filename in layers)
report = '''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LARy cumulative extent — research and source layers</title>
<style>
:root{font:17px/1.6 system-ui,sans-serif;color:#243644;background:#f4f3ed}body{max-width:1100px;margin:40px auto;padding:0 24px}h1{font-size:2.2rem;line-height:1.15}h2{margin-top:2.5rem}a{color:#086289}small{display:block;color:#536575;margin-top:.5em}table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{text-align:left;vertical-align:top;padding:14px 12px;border-bottom:1px solid #c9d0cf}th{background:#e5e9e5}td:first-child{min-width:100px}li{margin:.6em 0}.notice{border-left:5px solid #d77828;padding:12px 20px;background:#fff8ea}.map{background:white;border:1px solid #cad1d1;border-radius:8px;padding:14px}.map svg{display:block;width:100%;max-height:700px}label,button{display:inline-block;margin:6px 18px 6px 0}button{font:inherit;padding:2px 12px;cursor:pointer}.scroll{overflow-x:auto}code{font-size:.85em}.muted{color:#536575}@media print{body{max-width:none}.map svg{height:500px}button{display:none}}
</style>
<header><p class="muted">Research bundle · 26 October 2026</p><h1>LARy: building a cumulative map</h1>
<p><strong>No single year is an all-time extent.</strong> Use independently selectable source layers, then build a separately verified cumulative layer. The two converted GIS snapshots are useful starting data; they do not cover every historical alignment.</p></header>
<p class="notice"><strong>Status: incomplete historical coverage.</strong> The raw combined file contains 96 source features with overlap. The application displays a derived comparison: muted gold for shared stretches, long teal dashes for 1915-only stretches, and slate blue for 1930s-only stretches.</p>
<p>Scope assumed: passenger corridors used by LARy and its Yellow Car successors through 1963, including documented temporary alignments. Keep predecessor-only lines, freight spurs, yards and individual parallel tracks as separately scoped additions. “LARy company only” would require excluding successor-era additions.</p>
<h2>Separate layers and combined overlay</h2>
<p><a href="https://leahbrooks.org/leahweb/subpages/research.html">Brooks and Lutz’s public research GIS</a> contains a 1915 mixed-operator file and a <code>193x-LArail</code> file. The conversion keeps 59 records marked LA from 1915 and all 37 records from the latter. These are source features, not route totals. The <a href="https://www.leahbrooks.org/leahweb/papers/2019-01-10_brooks_lutz_streetcars_online_only_publication_part.pdf">data appendix, printed pages 69–70</a>, identifies a 1935 reference map; the exact snapshot date of the 193x geometry remains unverified.</p>
<ul>__DOWNLOADS__<li><a href="geojson/lary-combined-source-observations.geojson">Combined source observations GeoJSON</a></li><li><a href="geojson/lary-period-comparison.geojson">Classified period comparison used by the application</a></li></ul>
<p>All files use WGS84 longitude/latitude for MapLibre. Original attributes and source provenance are retained. Coordinate round-trip error is under 0.03 source feet; that checks conversion precision, not historical positional accuracy. See <a href="conversion-checks.json">conversion checks</a> and <a href="convert_sources.py">the reproducible converter</a>.</p>
<div class="map"><label style="color:#086289"><input type="checkbox" checked data-layer="early"> 1915 — blue solid</label><label style="color:#b5520a"><input type="checkbox" checked data-layer="later"> 1930s — orange dashed</label><button type="button" id="zoom-in" aria-label="Zoom in">+</button><button type="button" id="zoom-out" aria-label="Zoom out">−</button><button type="button" id="reset">Reset</button>
__SVG__
<small>North up · source geometry only, no basemap · hover for source route names · drag to pan. Offset lines may be digitizing differences or real changes; they need review before merging. <a href="comparison.svg">Standalone SVG</a>.</small></div>
<h2>Why a pair of years is insufficient</h2>
<p>Earlier losses, intermediate temporary construction, and later terminal additions all matter. The events below are a targeted review of ERHA route histories, not an exhaustive chronology. Each linked event still needs geometric reconciliation; dates should be corroborated with contemporary maps or notices. A service reroute over existing track does not add a physical corridor.</p>
<div class="scroll"><table><thead><tr><th>Date reported</th><th>Change to check</th><th>Coverage implication</th></tr></thead><tbody>__EVENTS__</tbody></table></div>
<h2>Sources to trace or verify</h2>
<p>Use the 1915 and 1930s vectors as starting layers, early maps for lost alignments, 1927/1928 sources for intermediate changes, 1938–1946 sources for later additions, and facilities plans plus late notices for terminal details. This combination is an audit strategy, not proof that every track is covered. Mixed rail/bus maps require checking the legend.</p>
<div class="scroll"><table><thead><tr><th>Period</th><th>Source and review status</th><th>Use and limitations</th></tr></thead><tbody>__SOURCES__</tbody></table></div>
<h2>How the eventual merge should work</h2><ol>__STEPS__</ol>
<p>Suggested selectable layers: <strong>1915 source</strong>, <strong>1930s source</strong>, <strong>early corrections</strong>, <strong>temporary alignments</strong>, <strong>later additions</strong>, and <strong>verified cumulative corridors</strong>. Keep facilities optional. The correction and verified cumulative layers have not yet been drawn.</p>
<p>The app uses a derived 1915 + 1930s comparison. <a href="classify_periods.py">The classifier</a> splits stretches using a five-metre tolerance and a maximum twenty-degree direction difference in UTM 11N. Crossing lines do not automatically match. Shared display geometry comes from the 1930s source, with exact duplicate paths dissolved within each display class. All classified source observations are retained with their original attributes and hidden from rendering. Geometric matches remain approximate: near-parallel tracks can match, and larger digitizing offsets can appear unique. Historical gaps still require review. The blue/orange SVG above remains the original unclassified source overlay.</p>
<footer><p><a href="coverage-audit.json">Machine-readable coverage audit</a> · <a href="sources.json">Source register</a></p><small>GIS credit: Leah Brooks and Byron Lutz (2019), “Vestiges of Transit: Urban Persistence at a Microscale,” Review of Economics and Statistics 101(3), 385–399; digitization credited to Jordan Hale. Source-specific metadata is included in each GeoJSON.</small></footer>
<script>
const svg=document.querySelector('.map svg');let box=[0,0,1000,1000];const render=()=>svg.setAttribute('viewBox',box.join(' '));
document.querySelectorAll('[data-layer]').forEach(input=>input.addEventListener('change',()=>document.getElementById(input.dataset.layer).style.display=input.checked?'':'none'));
function zoom(factor){const w=box[2]*factor,h=box[3]*factor;if(w<20||w>4000)return;box=[box[0]+(box[2]-w)/2,box[1]+(box[3]-h)/2,w,h];render();}
document.getElementById('zoom-in').onclick=()=>zoom(.7);document.getElementById('zoom-out').onclick=()=>zoom(1/.7);document.getElementById('reset').onclick=()=>{box=[0,0,1000,1000];render()};
svg.style.touchAction='none';let drag=null;function point(event){return new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse())}
svg.addEventListener('pointerdown',event=>{drag=point(event);svg.setPointerCapture(event.pointerId)});svg.addEventListener('pointermove',event=>{if(!drag)return;const current=point(event);box[0]+=drag.x-current.x;box[1]+=drag.y-current.y;render()});svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
</script></html>'''
for token, value in {"__DOWNLOADS__": downloads, "__SVG__": svg, "__EVENTS__": event_rows, "__SOURCES__": source_rows, "__STEPS__": steps}.items():
    report = report.replace(token, value)
(ROOT / "index.html").write_text(report)
print(f"Built report: {len(audit['events_to_reconcile'])} events, {len(sources)} sources")
