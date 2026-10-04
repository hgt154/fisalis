# What each country exports and imports, by product — CEPII BACI, HS 1992 version (1995 onwards)
#
# BACI reconciles what exporters and importers declare to the UN (Comtrade), for ~5,000 products
# and 200+ countries. It comes out once a year (January), about two years behind: the 2026 release
# ends in 2024. So this step runs once a year (run_products.R), not in the monthly job.
#
# For each economy (and the World, WLD) we publish:
#   - chapters:      exports and imports by HS chapter (2 digits) in the latest year and the year before
#   - groups:        the same, added up into 9 broad groups, for every year since 1995 (how the basket changed)
#   - concentration: Herfindahl index of exports over HS headings (4 digits), every year:
#                    0 = spread over many products, 1 = a single product
#
# Output: web/public/data/trade_products/index.json and one <ISO3>.json per economy.

library(dplyr)
library(tidyr)
library(purrr)
library(readr)

BACI_PAGE <- "https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html"
BACI_DATA <- "https://www.cepii.fr/DATA_DOWNLOAD/baci/data"

# ---------------------------------------------------------------------------
# Getting the file

# The newest release named on CEPII's page, e.g. "202601". BACI_VERSION in the environment wins.
baci_latest_version <- function() {
  forced <- Sys.getenv("BACI_VERSION")
  if (nzchar(forced)) return(forced)
  html <- httr2::request(BACI_PAGE) |>
    httr2::req_options(cainfo = ensure_ca_bundle()) |>
    httr2::req_timeout(60) |>
    httr2::req_perform() |>
    httr2::resp_body_string()
  found <- regmatches(html, gregexpr("BACI_HS92_V(\\d{6})", html))[[1]]
  if (length(found) == 0) stop("Could not find the BACI version on ", BACI_PAGE, ". Set BACI_VERSION, e.g. 202601.")
  max(sub("BACI_HS92_V", "", found))
}

# Path to the zip in raw/baci/, downloading it (~2.4 GB) only if it is not there yet.
# Without internet access to CEPII's page, the newest zip already in raw/baci/ is used.
baci_zip <- function() {
  dir <- file.path(PATH_RAW, "baci")
  dir.create(dir, recursive = TRUE, showWarnings = FALSE)
  version <- tryCatch(baci_latest_version(), error = function(e) {
    local <- sort(list.files(dir, pattern = "^BACI_HS92_V\\d{6}\\.zip$"), decreasing = TRUE)
    if (length(local) == 0) stop(e)
    warning("Using the local BACI file (", local[1], "): ", conditionMessage(e))
    sub("BACI_HS92_V(\\d{6})\\.zip", "\\1", local[1])
  })

  zip <- file.path(dir, sprintf("BACI_HS92_V%s.zip", version))
  if (!file.exists(zip)) {
    message("BACI: downloading release ", version, " (about 2.4 GB)…")
    partial <- paste0(zip, ".part")
    httr2::request(sprintf("%s/BACI_HS92_V%s.zip", BACI_DATA, version)) |>
      httr2::req_options(cainfo = ensure_ca_bundle()) |>
      httr2::req_timeout(3600) |>
      httr2::req_retry(max_tries = 3, retry_on_failure = TRUE) |>
      httr2::req_perform(path = partial)
    file.rename(partial, zip)
  }
  list(version = version, zip = zip)
}

# ---------------------------------------------------------------------------
# One year at a time (each file is ~10 million rows; we keep only small totals)

# Rows: t (year), i (exporter), j (importer), k (HS 6-digit product), v (thousands of US$)
aggregate_baci_year <- function(flows, year) {
  flows <- flows |> mutate(chapter = substr(k, 1, 2), heading = substr(k, 1, 4), value = v * 1000)

  herfindahl <- \(df) df |>
    group_by(code) |>
    summarise(hhi = sum((value / sum(value))^2), .groups = "drop")

  by_heading <- flows |> group_by(code = i, heading) |> summarise(value = sum(value), .groups = "drop")
  world_heading <- by_heading |> group_by(heading) |> summarise(value = sum(value), .groups = "drop") |> mutate(code = 0L)

  list(
    exports = flows |> group_by(code = i, chapter) |> summarise(value = sum(value), .groups = "drop"),
    imports = flows |> group_by(code = j, chapter) |> summarise(value = sum(value), .groups = "drop"),
    hhi     = bind_rows(herfindahl(by_heading), herfindahl(world_heading))   # code 0 = the World
  ) |> map(\(x) mutate(x, year = as.integer(year)))
}

# Every year in the zip, each one cached in raw/baci/ (a re-run takes seconds)
aggregate_baci <- function(baci) {
  files <- unzip(baci$zip, list = TRUE)$Name
  data_files <- sort(grep("^BACI_HS92_Y\\d{4}_", files, value = TRUE))
  tmp <- file.path(tempdir(), "baci")

  per_year <- map(data_files, \(file) {
    year <- as.integer(sub(".*_Y(\\d{4})_.*", "\\1", file))
    cache <- file.path(PATH_RAW, "baci", sprintf("agg_V%s_%d.rds", baci$version, year))
    if (file.exists(cache)) return(readRDS(cache))

    started <- Sys.time()
    unzip(baci$zip, files = file, exdir = tmp)
    flows <- read_csv(file.path(tmp, file), col_select = c(i, j, k, v),
                      col_types = cols(i = "i", j = "i", k = "c", v = "d"), progress = FALSE)
    unlink(file.path(tmp, file))
    agg <- aggregate_baci_year(flows, year)
    saveRDS(agg, cache)
    message(sprintf("BACI: %d (%s rows, %ss)", year, format(nrow(flows), big.mark = ","),
                    round(difftime(Sys.time(), started, units = "secs"))))
    agg
  })

  codes_file <- grep("^country_codes", files, value = TRUE)
  unzip(baci$zip, files = codes_file, exdir = tmp)
  codes <- read_csv(file.path(tmp, codes_file), show_col_types = FALSE) |>
    transmute(code = as.integer(country_code), iso3 = country_iso3)

  list(
    version = baci$version,
    exports = map(per_year, "exports") |> list_rbind(),
    imports = map(per_year, "imports") |> list_rbind(),
    hhi     = map(per_year, "hhi") |> list_rbind(),
    codes   = codes
  )
}

# ---------------------------------------------------------------------------
# Shaping (no files or downloads here, so it can be tested)

build_world_products <- function(agg, chapters, groups, valid_iso3, min_economies = 150) {
  codes <- bind_rows(agg$codes, tibble(code = 0L, iso3 = "WLD"))
  keep  <- c(valid_iso3, "WLD")

  # Exports and imports by country, chapter and year, plus the World (everyone added up)
  by_chapter <- bind_rows(
    agg$exports |> mutate(flow = "export"),
    agg$imports |> mutate(flow = "import")
  )
  by_chapter <- bind_rows(
    by_chapter,
    by_chapter |> group_by(flow, chapter, year) |> summarise(value = sum(value), .groups = "drop") |> mutate(code = 0L)
  ) |>
    inner_join(codes, by = "code") |>
    filter(iso3 %in% keep, value > 0) |>
    left_join(chapters |> select(chapter, group), by = "chapter") |>
    mutate(group = coalesce(group, "other"))                 # a code outside our list counts as "other"

  last_year <- max(by_chapter$year)

  # Latest year and the one before, side by side
  latest <- by_chapter |>
    filter(year %in% c(last_year, last_year - 1)) |>
    mutate(when = if_else(year == last_year, "value", "prev")) |>
    select(iso3, flow, chapter, when, value) |>
    pivot_wider(names_from = when, values_from = value, values_fill = 0)
  if (!"prev" %in% names(latest)) latest$prev <- 0
  latest <- latest |> filter(value > 0)

  # Every year, by broad group, one column per group
  history <- by_chapter |>
    group_by(iso3, year, flow, group) |>
    summarise(value = sum(value), .groups = "drop") |>
    mutate(group = factor(group, levels = groups$group)) |>
    arrange(group) |>
    pivot_wider(names_from = group, values_from = value, values_fill = 0)

  concentration <- agg$hhi |>
    inner_join(codes, by = "code") |>
    filter(iso3 %in% keep) |>
    select(iso3, year, hhi)

  economies <- latest |>
    filter(flow == "export") |>
    group_by(iso3) |>
    summarise(exports = sum(value), .groups = "drop") |>
    left_join(concentration |> filter(year == last_year) |> select(iso3, hhi), by = "iso3")

  if (nrow(economies) < min_economies || !"WLD" %in% economies$iso3) {
    stop(sprintf("BACI: only %d economies (World included: %s). Not writing anything.",
                 nrow(economies), "WLD" %in% economies$iso3))
  }

  list(
    version = agg$version, year = last_year, first_year = min(by_chapter$year),
    chapters = chapters, groups = groups, economies = economies,
    latest = latest, history = history, concentration = concentration
  )
}

# ---------------------------------------------------------------------------
# Writing

write_world_products <- function(wp) {
  out <- file.path(PATH_OUT, "trade_products")
  dir.create(out, recursive = TRUE, showWarnings = FALSE)
  unlink(list.files(out, pattern = "\\.json$", full.names = TRUE))

  w <- \(x, file) jsonlite::write_json(x, file.path(out, file),
                                       dataframe = "rows", na = "null", digits = NA, auto_unbox = TRUE)

  w(list(
    source     = "CEPII, BACI (HS 1992)",
    version    = wp$version,
    year       = wp$year,
    first_year = wp$first_year,
    groups     = wp$groups |> arrange(order) |> select(group, name_en, name_pt),
    chapters   = wp$chapters,
    economies  = wp$economies |> mutate(exports = round(exports), hhi = round(hhi, 4))
  ), "index.json")

  for (r in wp$economies$iso3) {
    w(list(
      iso3          = r,
      year          = wp$year,
      chapters      = wp$latest |> filter(iso3 == r) |> arrange(flow, desc(value)) |>
                        transmute(flow, chapter, value = round(value), prev = round(prev)),
      groups        = wp$history |> filter(iso3 == r) |> arrange(flow, year) |> select(-iso3) |>
                        mutate(across(-c(year, flow), round)),
      concentration = wp$concentration |> filter(iso3 == r) |> arrange(year) |>
                        transmute(year, hhi = round(hhi, 4))
    ), paste0(r, ".json"))
  }
  message(sprintf("BACI: wrote %d economies (%d–%d) to %s", nrow(wp$economies), wp$first_year, wp$year, out))
}
