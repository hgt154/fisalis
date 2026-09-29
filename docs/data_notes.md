# Data notes

## World Bank download (2026-09-26)
- 494,057 rows, all 129 indicators returned data (2000 onward).
- Timeouts on first attempt for 5 indicators; all succeeded on retry.
- Low-coverage indicators (<400 rows): EN.CLC.DRSK.XQ, SI.SPR.PC40.ZG, SI.SPR.PCAP.ZG,
  SL.FAM.0714.ZS, EN.CLC.MDAT.ZS, SL.TLF.0714.ZS, IE.PPI.WATR.CD, SI.RMT.COST.OB.ZS, SP.REG.BRTH.RU/UR.ZS
- Decision: keep them; the site hides sparklines when fewer than 3 points exist.

- Why TopoJSON rather than GeoJSON? In GeoJSON, a border shared by two countries (say Brazil and Argentina) is stored twice, once per country. TopoJSON stores each border once and lets both countries reference it. That makes the file much smaller, and neighboring countries line up perfectly.

- check_shapes should list only Gibraltar (GIB), which is too small to appear at 1:50m. That's acceptable: it will still appear in search and on its country page, just not on the map. 

- Other shapes on the map won't match World Bank data: Antarctica, Taiwan, Western Sahara, Greenland's neighbors such as the Falklands, and so on. That's fine. They'll show in the gray "No data" color, just like on the World Bank's own map.

- d3 handles map projections, zoom and color scales.
topojson-client turns your compact world.topo.json into shapes D3 can draw.
@types/… packages teach TypeScript what these libraries contain.

- Indicator Page
Design decisions worth knowing (and good interview material):
Brazil by default: the page never starts empty. The default isn't written into the URL, so a clean link stays clean.
At most 4 countries: more lines than that in a sparkline becomes unreadable.
Aggregates only when they really exist. The World Bank publishes aggregates for regions and income groups, so selecting "Latin America & Caribbean" adds its official aggregate. It does not publish aggregates for Mercosur or continents. Rather than inventing numbers, the page says so and suggests comparing countries. Computing your own bloc aggregates in R is a possible later improvement, but it needs care: you can add up population, but you can't add up life expectancy.
Tabs and topic live in the URL (?aba=sdg&grupo=...), like everything else, so any view can be shared.


- Comex Data Pipeline R
COMEX_COLS plus standardize() isolate the API's naming from the rest of your code. If MDIC renames a column, you fix one line. This is a common pattern called an adapter.
The cache is smarter than in Phase 2. Data from 2016–2025 won't change, so each past year is downloaded once and kept in raw/comex/. Only the current year is refreshed. After the first run, a monthly update takes a handful of requests instead of dozens.
Sys.sleep(1) plus the comexr.retry_time option respect the API's rate limit, which the package README says is strict.

## Comex Stat validation (2026-09-28)
- August 2026 totals reproduce Comex Vis exactly: exports US$ 33.2 bn (+12.2% YoY),
  imports US$ 25.8 bn (+9.2%), trade flow US$ 58.9 bn (+10.9%), balance US$ 7.4 bn.

## React Markdown
- yaml reads the data block at the top of each theory file.
react-markdown turns the Markdown text into HTML safely.

- how a file is organized
Between the two --- lines	The frontmatter: structured data in YAML format. The page uses it for the cards, filters and search.
subjects	Codes from this list: politica, economica, seguranca, filosofica, sociologica. A theory can have several.
related	The file names (without .md) of other theories. They become links.
references	Put each one in quotes. Colons and commas inside a citation would otherwise confuse YAML.
After the second ---	Normal Markdown text: ## headings, **bold**, - lists. It becomes the page body.

- Adding a theory from now on
Copy realismo.md and rename it, e.g. construtivismo.md. Use lowercase with no accents or spaces, since the name becomes the URL (/teorias/construtivismo).
Edit the frontmatter and the text.
Save. The theory appears on the site right away, with no code changes.
Commit, e.g. docs(theories): add constructivism.

Two tips:

If a new theory makes the page show "Missing frontmatter" or an empty card, the YAML block probably has a typo. The usual culprits are a missing --- line, or a colon inside an unquoted value (quote it).
You can also add a new subject, e.g. historica: add one line to SUBJECTS in theories.ts.


## Design
- Three tricks worth knowing:

The arcade frieze is a tiny SVG repeated as a background. It's the exact tile from the design, one arch 48×64 px, drawn with background-size. No images to load.
.slab redefines the color tokens inside itself. Everything inside a slab (footer, stats band) automatically gets light text and the bright "broto" accent, because CSS variables inherit. Any component placed on a slab adapts with no special code.
clamp(34px, 5vw, 48px) makes headings shrink smoothly on small screens, with no media queries needed.

- npm test startup error
  npm pkg set scripts.fresh="rm -rf node_modules package-lock.json && npm install"