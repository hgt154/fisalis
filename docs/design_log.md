Design implementation, D5 to D8
D5 · Indicators and Country pages

Goal: turn the Indicators and Country pages into one consistent, readable dashboard.

Shared IndicatorPanel: one component used by both pages. It holds the tabs (Visão geral / Por tema / Por ODS), the topic select, a sticky side index with counts, and the indicator table. Its state lives in the URL (?aba=, ?grupo=), so every view can be shared as a link.
IndicatorTable rebuilt as a CSS grid instead of a <table>, so rows restack on phones. When countries are compared, each column is tinted with its country's color through a CSS variable (style={{ '--c': color }}).
Definition popovers (ⓘ): InfoPopover shows the official World Bank definition on hover, focus or tap. It's accessible through aria-describedby and useId.
Portuguese group labels: groupLabel() translates the catalog's English group names and gives SDGs their number and official UN color. groupId() builds safe anchor ids.
Filter bar (GeoFilter): selected countries appear as chips inside the search box, with a dot in each country's series color. Backspace removes the last chip. On phones the dropdowns hide behind a "Filtros" button.
Country profile: breadcrumb, region and income group, bloc tags that link to filtered views, and a five-figure stat band (population, GDP, GDP per capita, life expectancy, exports as % of GDP).
Responsive sparklines: viewBox with preserveAspectRatio="none" and vector-effect: non-scaling-stroke, so lines stretch to any width at a constant thickness.
Dark mode: lighter series colors so the lines stay readable.
Other details: Intl.ListFormat('pt-BR') builds titles like "Brasil, Argentina e México"; the timeline ends at the last year that actually has data.
D6 · Map page

Goal: a proper choropleth ("coroplético") world map with a side panel, matching the design.

Map colors moved to CSS variables (--seq-1…6, --income-*), so dark mode can flip the scales. A D3 scale simply returns whatever strings you give it, including var(...).
WorldMap:
an optional globe mode draws the oval outline ({type:'Sphere'}) and grid lines (geoGraticule10);
a zoom-reset button uses zoomIdentity;
hovered countries get an outline;
tooltips accept JSX.
MapLegend: either category swatches (income) or a stepped color bar with the quantile boundaries (scale.quantiles()). "No data" is diagonally hatched so it's never confused with the lightest color.
MapSidePanel has three states:
World (or the filtered group) totals, with an income-distribution bar;
the selected country;
an empty state with "Limpar filtros".
Page layout: a "Colorir por" select grouped with <optgroup>, a count of matching economies, a loading skeleton that respects prefers-reduced-motion, and a source line. On phones the panel sits under the map like a bottom sheet.
Lesson (lint): reading ref.current during render is not allowed, because refs don't trigger re-renders. Compute the value in the event handler and keep it in state.
D7 · Trade page

Goal: restyle the Comex Stat page to the design without changing the data logic.

Page structure: a title with quick-anchor links; every section uses a shared Section frame (rule, title, context line, controls on the right).
Period switch moved into the summary header. Every other section shows the chosen period in its subtitle.
Summary cards: "US$ 33,2 bi", the change against the same period a year earlier, and surplus/deficit for the balance.
Charts:
TimeChart: legend, dashed imports, dots at the cursor, a month-and-values tooltip, and optional area shading;
Treemap: larger labels in large boxes, dark text on light colors (inkOn);
BarList: a ranked list with a light track behind each bar, value and share.
Products: export and import treemaps side by side with a shared sector legend. The two product-series sections are merged into one, with a flow switch.
useWidth custom hook: a ResizeObserver measures each chart's container, and charts draw at their real pixel width. Text is now 11px on every screen, instead of shrinking with a scaled SVG.
New tested helpers: formatUsdShort, continentShares, previousLabel.
Shared .tip tooltip style used by the maps, charts and treemaps.
Lesson (CSS): a <select> sizes itself to its longest option, which caused overflow twice. The fix is width: Npx; max-width: 100%.
D8 · Theories

Goal: a filterable library of IR theories and a rich article page.

Extended frontmatter: years, years_label, period, origin, authors with life dates, concepts with descriptions, related theories with a note. Old-style simple lists still parse.
Data layer (lib/theories.ts):
parseTheory normalizes every field;
periodOf places a theory by its starting year (Clássico < 1945, Guerra Fria 1945–1989, Pós-Guerra Fria ≥ 1990);
filterTheories combines subjects with OR, then period and search with AND;
countBySubject gives checkbox counts that respect the other filters;
headingsOf, readingMinutes and slugify support the article page.
Library page: search, subject checkboxes with counts, period radios, a list/card switch, removable filter chips, and an empty state. The full state is in the URL (?assunto=&periodo=&q=&vista=).
Article page:
breadcrumb, lead, and an info box (period, origin, reading time);
table of contents generated from the ## headings, via a custom h2 in react-markdown that adds matching ids;
drop cap and a styled quote block;
side column with concepts, authors and related theories;
references with a hanging indent.
Content: 9 starter entries with real authors and references. They're drafts to review and expand.
Infrastructure fixes along the way
iCloud: the project was in an iCloud-synced folder (Desktop). iCloud created duplicate files ("… 2.ts"), offloaded files as .icloud placeholders, and broke node_modules (the "Cannot find native binding" error). Fix: moved the repo to ~/Projects/fisalis and reinstalled dependencies cleanly.
.gitignore bug: a # only starts a comment at the beginning of a line, so pipeline/raw/ # comment matched nothing and the raw cache had been committed. Fixed the line, then ran git rm -r --cached pipeline/raw, which removes files from git while keeping them on disk.
Push HTTP 400: large pushes exceeded git's default HTTP buffer. Fixed with git config --global http.postBuffer 524288000.
Tests

Tests went from 26 to 38. They cover formatting, trade calculations, indicator labels and theory parsing/filtering. Every step was checked with type-checking, ESLint, a production build, and screenshots in light mode, dark mode and on a phone.