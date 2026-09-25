# Fisális — Global Affairs Data

An open data platform for studying **International Relations**: an interactive world map, key development indicators, Brazilian foreign trade statistics, a library of IR theories, and AI-summarized news — all in one place.

> 🚧 **Status:** in active development. See the [roadmap](#roadmap) for progress.

<!-- Add a screenshot or GIF here once the first page is live -->
<!-- ![Fisális screenshot](docs/screenshot.png) -->

**Live site:** _coming soon_

---

## Why this project

Data for international relations is scattered across many sources — the World Bank, Brazil's Ministry of Development, Industry, Trade and Services (MDIC), news outlets, and academic literature. Fisális brings them together in a single, filterable interface so students, researchers and curious readers can explore countries, blocs and regions side by side.

## Features

| Page | Description | Data source |
|---|---|---|
| **World Map** | Interactive choropleth map. Hover a country for key figures, click for a full profile. Filter by country, bloc, continent and region. | World Bank (WDI) |
| **Indicators** | Key social, economic, environmental and institutional indicators, organized by overview, theme and Sustainable Development Goal (SDG), with trend sparklines. | World Bank (WDI) |
| **Brazil Foreign Trade** | Exports, imports, trade balance, partner countries, states and products, with historical series. | Comex Stat (MDIC) |
| **IR Theories** | Political, economic, security, philosophical and sociological theories relevant to International Relations, filterable by subject. | Curated content |
| **News** | Current news from trusted sources, summarized and categorized with AI. Every summary links to the original article. | RSS feeds + LLM |

## Tech stack

**Data pipeline:** R
- [`WDI`](https://cran.r-project.org/package=WDI) — World Bank World Development Indicators
- [`comexr`](https://cran.r-project.org/package=comexr) — Comex Stat API client
- `dplyr`, `tidyr`, `jsonlite` — data wrangling and export
- `rnaturalearth`, `geobr`, `rmapshaper` — map geometries
- `renv` — reproducible package management
- `testthat` — data quality tests

**Website:** React + TypeScript (Vite)
- D3 — maps and treemaps
- ECharts / Recharts — line and bar charts
- React Router — navigation

**Infrastructure**
- GitHub Actions — scheduled data updates and CI
- Vercel / Netlify — hosting

## Architecture

```
  World Bank API ─┐
  Comex Stat API ─┼──►  R pipeline  ──►  JSON files  ──►  React website
  RSS feeds ──────┘   (fetch, clean,     (web/public/     (reads static
                       test, export)      data/)           data, no live
                                                           API calls)
```

The website never calls external APIs directly. Data is pre-processed by the R pipeline on a schedule and saved as static JSON. This keeps the site fast, avoids API rate limits, and makes every number reproducible.

## Project structure

```
.
├── pipeline/          # R project — data collection and processing
│   ├── config/        # Indicator catalog, bloc membership tables
│   ├── R/             # Functions
│   ├── tests/         # Data quality tests
│   └── run_pipeline.R # Entry point
├── web/               # React + TypeScript website
│   ├── public/data/   # Generated JSON (output of the pipeline)
│   └── src/
└── docs/              # Data dictionary, design decisions
```

## Getting started

### Prerequisites
- [R](https://cran.r-project.org/) (≥ 4.1) and RStudio
- [Node.js](https://nodejs.org/) (LTS)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/fisalis.git
cd fisalis
```

### 2. Run the data pipeline
Open `pipeline/pipeline.Rproj` in RStudio, then:
```r
renv::restore()          # install the exact package versions
source("run_pipeline.R") # fetch data and write JSON to web/public/data/
```

### 3. Run the website
```bash
cd web
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

## Roadmap

- [x] Project setup
- [ ] Indicator catalog and World Bank pipeline
- [ ] Indicators page
- [ ] World map page
- [ ] Country profile page
- [ ] Comex Stat pipeline
- [ ] Brazil foreign trade page
- [ ] Home page
- [ ] IR theories page
- [ ] AI news page
- [ ] Automated data updates (GitHub Actions)
- [ ] Deployment

## Data sources & attribution

- **World Bank** — [World Development Indicators](https://data.worldbank.org/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Comex Stat** — Brazilian foreign trade statistics, [Ministry of Development, Industry, Trade and Services (MDIC)](https://comexstat.mdic.gov.br/).
- **Natural Earth** — country boundaries, public domain.
- **News** — summaries are original, AI-generated text; every item credits and links to its original source.

Economic bloc memberships (Mercosur, EU, BRICS, etc.) are maintained manually in `pipeline/config/blocs.csv`, with sources and dates recorded.

## Author

**Hugo** — [GitHub](https://github.com/<your-username>) · [LinkedIn](https://linkedin.com/in/<your-profile>)

## License

Code released under the [MIT License](LICENSE). Data remains subject to the licenses of its original sources.
