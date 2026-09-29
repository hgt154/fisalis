Phases Overview:
Phase 0: Setup (1–2 days)
Install the tools. You need R and RStudio (or Positron), Node.js LTS, Git, VS Code and a GitHub account.
Create one repo with two folders.
   /pipeline   → R project (data collection & processing)
   /web        → React app (the website)
   /docs       → notes, data dictionary, decisions
Use renv in /pipeline (renv::init()). This pins your package versions so anyone can reproduce your results. Recruiters notice this.
Write a README on day one. Say what the project is, the stack, and how to run it. Keep it updated as you go.
Commit small and often, with clear messages (e.g. feat(pipeline): fetch WDI indicators). Your commit history is part of the portfolio.

Done when: the repo is on GitHub, the R project opens, and npm create vite@latest web -- --template react-ts runs.

Phase 1: Design the indicator catalog (1–2 days)

This is the most important design step. Your list repeats many indicators across sections. Internet use, homicides, debt, forest area, CO₂, life expectancy and poverty each appear in more than one place. So don't store data per section. Store each indicator once and map it to its sections.

Create pipeline/config/indicators.csv with these columns:
code, name_pt, name_en, unit, format, higher_is_better, source_note
Create pipeline/config/indicator_groups.csv (a many-to-many table):
code, view, group, order
view is one of overview, theme or sdg.
group is something like Social, Economic, Agriculture or SDG 1.
order is the display position.
Find each World Bank code yourself. This is good practice. There are two ways:
In R: WDI::WDIsearch("life expectancy").
On data.worldbank.org: open the indicator and read the code from the URL (e.g. /indicator/SP.DYN.LE00.IN).
Some you can check against: SP.DYN.LE00.IN (life expectancy), SP.POP.TOTL (population), SP.POP.GROW (population growth), NY.GDP.MKTP.CD (GDP), NY.GDP.PCAP.CD (GDP per capita), NY.GDP.MKTP.KD.ZG (GDP growth), SL.UEM.TOTL.ZS (unemployment), FP.CPI.TOTL.ZG (inflation).
Watch for label changes.
The World Bank has updated the international poverty line. The "US$1,90/dia" label in your list is outdated. Use whatever label the API returns for the current SI.POV.DDAY.
Some CO₂ and greenhouse-gas codes were renamed (the …excluding LULUCF series). Always take the name from the API, not from old notes.
Some SDG items in your list aren't WDI indicators. Examples: disaggregated stunting and some remittance-cost series. Look for them with WDIsearch. If they're missing, check the WB SDG Atlas or the UN SDG database. Otherwise mark them unavailable and move on. Don't let a few items block the project.

Done when: every indicator in your list has a verified code or is marked unavailable.

Phase 2: World Bank pipeline in R (3–5 days)
Install packages: WDI, dplyr, tidyr, readr, jsonlite, arrow (optional), testthat.
Get country metadata. WDI(..., extra = TRUE) or WDI_data$country gives iso3, region, income group, capital, latitude and longitude.
Filter out aggregates: drop rows where region == "Aggregates". Keep aggregates in a separate table for "World", "Latin America" and similar comparisons.
Get the data. Write a function fetch_indicators(codes, start = 2000) that:
requests the codes in batches (the API is more reliable with smaller requests),
retries on failure,
returns long format: iso3, code, year, value.
Create derived tables:
latest.json: the most recent non-NA value and its year per country × indicator. This is what "76 (2024)" in the WB layout shows.
series/{iso3}.json: every series for one country, used for sparklines. One file per country keeps page loads small.
map_summary.json: per country, the name, income group, population, GDP, region and blocs. This powers the map tooltips.
Create the blocs table by hand. config/blocs.csv with columns iso3, bloc (Mercosur, EU, BRICS, ASEAN, G20, NATO, AU…). Record the source and date for each bloc, since membership changes.
Add data-quality tests in testthat:
no duplicate iso3 + code + year,
every code in the config returned data,
every country in the data has a region.
Write one entry script, run_pipeline.R, that runs everything and writes into web/public/data/.

Done when: Rscript run_pipeline.R rebuilds all JSON files from nothing.

Phase 3: Map geometry (1–2 days)
Download country shapes in R with rnaturalearth at the 1:110m or 1:50m scale.
Join to your data by ISO3. Known problems:
Natural Earth uses -99 for a few countries, such as France and Norway in some versions. Use the ISO_A3_EH or ADM0_A3 column.
The World Bank uses XKX for Kosovo.
Write a small correction table and test that no WB country is left without a shape.
Shrink the file with rmapshaper::ms_simplify(), then export to TopoJSON (geojsonio). Aim for under 300 KB.


Phase 4: Front-end foundation (3–4 days)
Set up React + TypeScript + Vite. Add:
react-router for pages,
d3 for the map and treemaps,
echarts or recharts for line and bar charts (D3 works too; it's harder but teaches more),
tailwindcss or CSS modules for styling.
Define the routes:
   /                 Home
   /map              World map
   /country/:iso3    Country detail (reached from the map)
   /indicators       Indicators
   /trade            Brazil foreign trade
   /theories         IR theories
   /news             AI news
Build a shared layout: header, navigation, footer, and a language switch if you want PT/EN.
Build one filter component and reuse it everywhere. A single <GeoFilter> with country search, bloc, continent and region. Keep the filter state in the URL (?region=LCN&bloc=MERCOSUR). Then filtered views can be shared and bookmarked, which is a detail that impresses reviewers.
Write TypeScript types for every JSON file (CountrySummary, IndicatorLatest, …). Mismatches between the pipeline and the site then show up as compile errors.


Phase 5: Map page (like your first screenshot) (5–7 days)
Draw the map with d3.geoPath and a projection (geoNaturalEarth1 or geoEqualEarth) in an SVG.
Color countries by income group with a categorical scale: High, Upper-middle, Lower-middle, Low, No data. Add a legend below the map.
Hover: show a tooltip like "Brazil: 2.28 Trillion" and highlight the country's border.
Zoom: add +/− buttons and wheel zoom with d3.zoom.
Side panel: by default it shows "World" with population and GDP. When a country is selected, it shows that country plus a "Country profile →" link to /country/:iso3.
Search box ("Search economy"): autocomplete that selects and centers the country.
Filters: dim the countries outside the filter (don't remove them). The panel then shows the totals for the filtered group.
Nice extra: a dropdown that recolors the map by any indicator (sequential color scale), e.g. GDP per capita or Gini.

Done when: hover, click, search, zoom and filters all work, and the map is usable on a phone.

Phase 6: Indicators page (like your second screenshot) (5–7 days)
Header: chips for the selected countries ("Brasil ×") and a + button to add more.
Tabs: Overview | By Theme | By SDG Goal. These come straight from the view column in your indicator_groups.csv.
Topic dropdown: jumps to a group (Social, Economic, Agriculture, SDG 3…).
Row layout: indicator name with an ⓘ tooltip (the WB definition, fetched in the pipeline), then the most recent value with its year, then a sparkline from 2000 to today.
Number formatting: write one formatValue(value, unit) helper. It should give 2.28 Trillion, 76, 3.0%, and Portuguese formats (3,0) through Intl.NumberFormat('pt-BR').
Several countries selected: overlay the sparklines, or switch to a comparison table.
Bloc, continent or region selected: show the World Bank aggregate where one exists (e.g. Latin America & Caribbean). For your own blocs, compute population-weighted or summed values in R, and label them as your calculation.


Phase 7: Comex Stat pipeline in R (4–6 days)
Install comexr from CRAN and explore it: comex_details(), comex_filters(), comex_metrics().
Work out the periods from the latest month the data covers:
current month (e.g. Aug 2026) vs. the same month last year,
year to date (Jan–Aug 2026) vs. Jan–Aug 2025,
the last full year (2025) vs. 2024.
Build the tables your screenshots need:
Section	Query	Output file
Summary cards	total export/import FOB for each period	trade/summary.json (exports, imports, trade flow = X+M, balance = X−M, YoY %)
Historical series	monthly total 1997→today; also by ISIC section	trade/series_total.json, trade/series_isic.json
Partner countries	by country × flow × period, plus continent	trade/partners.json (value, YoY %, absolute change, share)
States	by state × flow × period	trade/states.json
Exported/imported products	by SH4 (or CUCI) with ISIC section for colors	trade/products_export.json, trade/products_import.json
Product series	monthly series for the top ~50 products	trade/product_series/{code}.json
Respect the rate limits. Add Sys.sleep() between calls, and cache raw responses in pipeline/raw/ so you don't download history again. Only the most recent months need refreshing.
Tests: summary exports should equal the sum of exports by country, and shares should add up to 100%.


Phase 8: Trade page (like your other screenshots) (7–10 days)

Build it section by section, in the order of the Comex Vis page:

Summary panel. A period toggle (Month | YTD | Year) and 4 cards: Exports, Imports, Trade flow, Balance. Each card shows an arrow with the % change and says "Surplus" or "Deficit".
Historical series. A Total/ISIC toggle, plus Monthly/Annual/Accumulated, Exp–Imp/Trade flow/Balance, and Line/Bar options. Do the frequency and series changes in the browser from the monthly data. It's a good exercise in data transformation.
Partner countries. A d3.treemap grouped by continent with a tooltip (value, change, absolute change, share). Flow and view toggles let the user switch to a geographic view, which reuses your Phase 5 map component. Add a top-10 bar chart below.
States. A choropleth of Brazil (state shapes from the geobr R package) with a log color scale, like the screenshot, next to a ranked bar chart.
Exported/imported products. A treemap colored by ISIC section (Agriculture, Extractive, Manufacturing, Others).
Product series. A product dropdown plus a US$/Weight toggle.
Extras: the ⊞ icon shows the data as a table; the 📷 icon exports a PNG.
Phase 9: Home, theories, news (ongoing)
Home: what the project is and why, one card per page with a link, the data sources, and "last updated" dates read from your JSON files.
Theories: one Markdown file per theory with frontmatter like this:
yaml
  title: Realism
  subject: [political, security]
  authors: [Morgenthau, Waltz]
  period: 20th century
  key_concepts: [anarchy, balance of power]
  references: [...]

Load the files with Vite's import.meta.glob and filter by subject. Add content bit by bit as you settle on your sources.

News (build last): a scheduled script reads RSS feeds from trusted sources. It sends each item to an LLM API with a fixed prompt ("summarize in 3 sentences, classify region + topic, return JSON") and writes news.json.
Store only your summary, the headline, the source and the link. Never republish full articles.
Keep the API key in GitHub Secrets and never commit it.
Phase 10: Automate & deploy (2–3 days)
GitHub Actions:
a weekly job that runs the WB pipeline,
a monthly job that runs Comex (MDIC releases each month's data early in the following month),
a daily job for news.
Each job commits the updated JSON, and the site rebuilds automatically.
Deploy on Vercel or Netlify (free), connected to the repo.
Add a CI job that runs testthat and vitest on every push. Add the passing badge to your README.
Making it a strong portfolio piece
Pin the repo on GitHub. Put a screenshot or GIF and the live link at the top of the README.
Write docs/decisions.md: why R + React, why pre-computed JSON instead of calling APIs live, and how you handled ISO mismatches. Interviewers love asking about trade-offs.
Write docs/data_dictionary.md from your indicator catalog. It shows data-analyst thinking.
Add a few front-end tests with Vitest + Testing Library (e.g. formatValue, the filter logic).
Write a short case study on LinkedIn or Substack once the map and indicators pages are live. Don't wait for the whole project to be finished.


Phase 1 Walkthrough 


Phase 2 Walkthrough


Phase 3 Walkthrough
Step 1: Install packages (Console)
r
install.packages(c("sf", "rnaturalearth", "rnaturalearthdata"))
renv::snapshot()

sf ("simple features") is R's standard package for maps. It stores a map as a normal table plus a geometry column holding each country's shape.

Step 2: Explore first (Console)
r
library(sf)
world <- rnaturalearth::ne_countries(scale = 50, returnclass = "sf")

nrow(world)                                   # 242 shapes
plot(st_geometry(world))                      # a world map appears in the Plots panel
world |> st_drop_geometry() |> dplyr::select(admin, iso_a3_eh, adm0_a3) |> head(20)
world |> st_drop_geometry() |> dplyr::filter(iso_a3_eh == "-99") |> dplyr::select(admin, adm0_a3)

The last line shows the four "-99" rows. Notice that adm0_a3 always has a code (KOS, SOL, CYN, KAS), so it works as a fallback.

Step 3: The correction table (config/geo_fixes.csv)

Create it in VS Code or RStudio, just like blocs.csv:

csv
ne_code,iso3,reason
KOS,XKX,Kosovo: Natural Earth code differs from World Bank code
JEY,CHI,Jersey: World Bank reports Jersey and Guernsey together as Channel Islands
GGY,CHI,Guernsey: World Bank reports Jersey and Guernsey together as Channel Islands
SOL,SOM,Somaliland: World Bank data for Somalia includes Somaliland
CYN,CYP,Northern Cyprus: World Bank data for Cyprus covers the whole island

The last two rows are an editorial choice, not just a technical one. They follow the World Bank's convention because that's where your data comes from. Mention it on the site's methodology page. It's the kind of detail an IR audience notices.

Step 4: R/geometry.R (script file)
r
library(dplyr)
library(sf)

# Country shapes keyed by World Bank ISO3 codes
build_world_shapes <- function() {
  sf_use_s2(FALSE)   # simpler geometry engine; avoids errors when merging shapes

  fixes <- readr::read_csv(file.path(PATH_CONFIG, "geo_fixes.csv"), show_col_types = FALSE)

  rnaturalearth::ne_countries(scale = 50, returnclass = "sf") |>
    transmute(ne_code = if_else(iso_a3_eh == "-99", adm0_a3, iso_a3_eh)) |>
    left_join(fixes |> select(ne_code, iso3), by = "ne_code") |>
    mutate(iso3 = coalesce(iso3, ne_code)) |>
    group_by(iso3) |>
    summarise(.groups = "drop")          # merges pieces that share a code (JEY+GGY -> CHI)
}

# Which World Bank countries have no shape?
check_shapes <- function(countries, shapes) {
  countries |> filter(!iso3 %in% shapes$iso3) |> select(iso3, name_en)
}

# Save GeoJSON, then simplify + convert to TopoJSON with mapshaper
export_world <- function(shapes) {
  dir.create(PATH_RAW, showWarnings = FALSE)
  geo  <- file.path(PATH_RAW, "world.geojson")
  topo <- file.path(PATH_OUT, "world.topo.json")

  st_write(shapes, geo, delete_dsn = TRUE, quiet = TRUE)

  status <- system2("npx", c("-y", "mapshaper", shQuote(geo),
                             "-simplify", "15%", "keep-shapes",
                             "-rename-layers", "countries",
                             "-o", "format=topojson", "quantization=1e5", shQuote(topo)))
  if (status != 0) stop("mapshaper failed")

  message("Wrote ", topo, " (", round(file.size(topo) / 1024), " KB)")
}

What's new here:

Code	What it does
if_else(iso_a3_eh == "-99", adm0_a3, iso_a3_eh)	Uses the backup code when the main one is "-99".
left_join(fixes) + coalesce(iso3, ne_code)	If a code appears in your fixes table, use the corrected one; otherwise keep the original. coalesce means "take the first value that isn't NA".
group_by(iso3) |> summarise()	On an sf table, summarising merges the shapes. That's how Jersey and Guernsey become one "Channel Islands" shape, and Somalia absorbs Somaliland.
system2("npx", ...)	Runs a terminal command from inside R, so the whole pipeline stays one script.
-simplify 15% keep-shapes	Keeps 15% of the border points, which is plenty at world scale. keep-shapes stops tiny islands from disappearing.
quantization=1e5	Rounds coordinates to a fine grid, which shrinks the file a lot with no visible difference.

Why TopoJSON rather than GeoJSON? In GeoJSON, a border shared by two countries (say Brazil and Argentina) is stored twice, once per country. TopoJSON stores each border once and lets both countries reference it. That makes the file much smaller, and neighboring countries line up perfectly.

Step 5: Run and check (Console)

Restart R, then:

r
source("R/paths.R")
source("R/countries.R")
source("R/geometry.R")

countries <- get_countries()
shapes    <- build_world_shapes()

nrow(shapes)
check_shapes(countries, shapes)

check_shapes should list only Gibraltar (GIB), which is too small to appear at 1:50m. That's acceptable: it will still appear in search and on its country page, just not on the map. Write it in docs/data_notes.md.

Other shapes on the map won't match World Bank data: Antarctica, Taiwan, Western Sahara, Greenland's neighbors such as the Falklands, and so on. That's fine. They'll show in the gray "No data" color, just like on the World Bank's own map.

Then export:

r
export_world(shapes)

The first run downloads mapshaper (about 30 s). Expect a message like Wrote ../web/public/data/world.topo.json (250 KB).

Tuning the size:

Over 300 KB: change 15% to 10%.
Borders look jagged later on the site: go up to 20%.
Step 6: Look at it

Go to mapshaper.org in your browser and drag web/public/data/world.topo.json onto the page. You'll see your map. Zoom into Europe, the Caribbean and Southeast Asia to check that small countries survived and the borders look clean. Click a country to check its iso3, e.g. Kosovo should show XKX.

Step 7: Commit
bash
git status
git add pipeline/R/geometry.R pipeline/config/geo_fixes.csv pipeline/renv.lock web/public/data/world.topo.json docs/data_notes.md
git commit -m "feat(pipeline): world map geometry with WB code fixes, exported as TopoJSON"
git push

raw/world.geojson stays out, as before. It's an intermediate file.

If something goes wrong
Error	Fix
npx: command not found inside RStudio	RStudio can't see Node. In the Console, run Sys.setenv(PATH = paste("/usr/local/bin", Sys.getenv("PATH"), sep = ":")) and try again. As a fallback, run the mapshaper command from the VS Code terminal, starting inside pipeline/.
Loop 0 is not valid or other geometry errors	Make sure sf_use_s2(FALSE) is the first line of build_world_shapes().
rnaturalearthdata asks to install something	Say yes. It holds the 1:50m data.

With world.topo.json in place, the map page (Phase 5) has everything it needs: shapes keyed by iso3, and data in map_summary.json keyed by the same iso3.

Phase 4 Walkthrough 

