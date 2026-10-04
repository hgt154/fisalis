# Armed conflicts — UCDP, Uppsala Conflict Data Program (CC BY 4.0)
#
# Yearly datasets (new version every June, for the year before):
#   - UCDP/PRIO Armed Conflict Dataset: every armed conflict since 1946 (>= 25 battle deaths in a year),
#     its parties, type and intensity (1 = 25-999 deaths, 2 = 1,000+ deaths: a "war")
#   - Battle-related deaths (dyadic): deaths in each conflict since 1989 (low / best / high)
#   - Country-year organized violence: deaths per country and year since 1989, split into
#     state-based conflict, non-state conflict and one-sided violence (against civilians)
# Preliminary monthly events (GED Candidate): the current year, revised later.
#
# Output: web/public/data/conflicts/ — summary.json, conflicts.json, map.json, candidate.json
# and countries/<ISO3>.json (each country's conflicts and yearly deaths).

library(dplyr)
library(tidyr)
library(purrr)
library(readr)

UCDP_DOWNLOADS <- "https://ucdp.uu.se/downloads"

TYPE_KEYS  <- c("1" = "extrasystemic", "2" = "interstate", "3" = "intrastate", "4" = "internationalized")
INCOMPAT   <- c("1" = "territory", "2" = "government", "3" = "both")
VIOLENCE   <- c("1" = "sb", "2" = "ns", "3" = "os")    # state-based, non-state, one-sided

# Gleditsch-Ward codes that countrycode does not translate: historical states are attached
# to today's country so they appear in its history (the page names the historical state).
GW_OVERRIDES <- c(
  "678" = "YEM",   # Yemen (North Yemen) — UCDP still uses it for today's Yemen
  "680" = "YEM",   # South Yemen
  "816" = "VNM",   # Vietnam (North Vietnam)
  "817" = "VNM",   # South Vietnam
  "345" = "SRB",   # Yugoslavia / Serbia
  "55"  = "GRD",   # Grenada
  "751" = "IND",   # Hyderabad (annexed by India, 1948)
  "260" = "DEU",   # West Germany
  "265" = "DEU",   # East Germany
  "315" = "CZE"    # Czechoslovakia
)

# Gleditsch-Ward number -> ISO3 (a separate function so the tests can stand in for countrycode)
gw_lookup <- function(gw) countrycode::countrycode(gw, "gwn", "iso3c", warn = FALSE)

# "365, 369" -> c("RUS", "UKR"); empty or unknown codes are dropped
gw_to_iso3 <- function(codes) {
  gw <- unlist(strsplit(as.character(codes[!is.na(codes)]), ",\\s*"))
  gw <- trimws(gw[nzchar(trimws(gw))])
  if (length(gw) == 0) return(character())
  iso <- unname(ifelse(gw %in% names(GW_OVERRIDES), GW_OVERRIDES[gw],
                       gw_lookup(suppressWarnings(as.integer(gw)))))
  unique(iso[!is.na(iso)])
}

# ---------------------------------------------------------------------------
# Finding and downloading the files

# The newest yearly version ("261") and candidate files named on UCDP's downloads page.
# UCDP_VERSION in the environment wins for the yearly version.
ucdp_discover <- function() {
  html <- httr2::request(paste0(UCDP_DOWNLOADS, "/")) |>
    httr2::req_options(cainfo = ensure_ca_bundle()) |>
    httr2::req_timeout(60) |>
    httr2::req_perform() |>
    httr2::resp_body_string()

  yearly <- regmatches(html, gregexpr("ucdp-prio-acd-(\\d{3})-csv\\.zip", html))[[1]]
  version <- Sys.getenv("UCDP_VERSION")
  if (!nzchar(version)) {
    if (length(yearly) == 0) stop("No UCDP yearly version found on ", UCDP_DOWNLOADS, ". Set UCDP_VERSION, e.g. 261.")
    version <- max(sub("ucdp-prio-acd-(\\d{3})-csv\\.zip", "\\1", yearly))
  }
  candidate <- unique(regmatches(html, gregexpr("GEDEvent_v[0-9_]+\\.csv", html))[[1]])
  list(version = version, candidate = pick_candidate_files(candidate))
}

# For the newest candidate year: the cumulative file (e.g. v26_01_26_06 = Jan-Jun) plus
# every monthly file after it (v26_0_7, v26_0_8). Without a cumulative file, all monthly files.
pick_candidate_files <- function(files) {
  if (length(files) == 0) return(character())
  yy <- max(as.integer(sub("GEDEvent_v(\\d+)_.*", "\\1", files)))
  this_year <- files[startsWith(files, sprintf("GEDEvent_v%d_", yy))]
  cumulative <- grep(sprintf("^GEDEvent_v%d_01_%d_\\d+\\.csv$", yy, yy), this_year, value = TRUE)
  monthly <- grep(sprintf("^GEDEvent_v%d_0_\\d+\\.csv$", yy), this_year, value = TRUE)
  month_of <- \(f) as.integer(sub(".*_(\\d+)\\.csv$", "\\1", f))
  if (length(cumulative) == 0) return(monthly[order(month_of(monthly))])
  cumulative <- cumulative[which.max(month_of(cumulative))]
  later <- monthly[month_of(monthly) > month_of(cumulative)]
  c(cumulative, later[order(month_of(later))])
}

# Download a file into raw/ucdp/ (once: UCDP file names change with every version)
ucdp_file <- function(relative) {
  path <- file.path(PATH_RAW, "ucdp", basename(relative))
  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  if (!file.exists(path)) {
    message("UCDP: downloading ", basename(relative))
    httr2::request(paste0(UCDP_DOWNLOADS, "/", relative)) |>
      httr2::req_options(cainfo = ensure_ca_bundle()) |>
      httr2::req_timeout(600) |>
      httr2::req_retry(max_tries = 3, retry_on_failure = TRUE) |>
      httr2::req_perform(path = path)
  }
  path
}

read_ucdp <- function(path) {
  if (grepl("\\.zip$", path)) {
    csv <- grep("\\.csv$", unzip(path, list = TRUE)$Name, value = TRUE)[1]
    unzip(path, files = csv, exdir = tempdir(), overwrite = TRUE)
    path <- file.path(tempdir(), csv)
  }
  # Country-code columns can hold lists ("365, 369"), so they are always read as text
  read_csv(path, show_col_types = FALSE, guess_max = 1e5, progress = FALSE) |>
    mutate(across(any_of(c("gwno_a", "gwno_a_2nd", "gwno_b", "gwno_b_2nd", "gwno_loc")), as.character))
}

fetch_conflicts <- function() {
  found <- ucdp_discover()
  v <- found$version
  message("UCDP: yearly version ", v, " | candidate files: ", paste(found$candidate, collapse = ", "))
  candidate <- map(found$candidate, \(f) read_ucdp(ucdp_file(paste0("candidateged/", f))) |> mutate(release = f)) |>
    list_rbind()
  list(
    version   = v,
    acd       = read_ucdp(ucdp_file(sprintf("ucdpprio/ucdp-prio-acd-%s-csv.zip", v))),
    brd       = read_ucdp(ucdp_file(sprintf("brd/ucdp-brd-dyadic-%s-csv.zip", v))),
    cy        = read_ucdp(ucdp_file(sprintf("organizedviolencecy/organizedviolencecy-%s-csv.zip", v))),
    candidate = candidate,
    candidate_files = found$candidate
  )
}

# ---------------------------------------------------------------------------
# Shaping (no downloads here, so it can be tested)

# Every country linked to each conflict, with its strongest role over the years:
# "location" > "party" (primary side) > "supporter" (secondary side)
conflict_countries <- function(acd) {
  roles <- list(location = "gwno_loc", party = c("gwno_a", "gwno_b"), supporter = c("gwno_a_2nd", "gwno_b_2nd"))
  map(names(roles), \(role) {
    acd |>
      select(conflict_id, all_of(intersect(roles[[role]], names(acd)))) |>
      pivot_longer(-conflict_id, values_to = "gw") |>
      filter(!is.na(gw)) |>
      distinct(conflict_id, gw) |>
      mutate(iso3 = map(gw, gw_to_iso3)) |>
      unnest(iso3) |>
      distinct(conflict_id, iso3) |>
      mutate(role = role)
  }) |>
    list_rbind() |>
    mutate(rank = match(role, names(roles))) |>
    group_by(conflict_id, iso3) |>
    slice_min(rank, n = 1, with_ties = FALSE) |>
    ungroup() |>
    select(conflict_id, iso3, role)
}

build_conflicts <- function(raw, valid_iso3, min_conflicts = 200) {
  acd <- raw$acd
  last_year <- max(acd$year)

  # Deaths per conflict and year (battle-related deaths, since 1989)
  deaths <- raw$brd |>
    group_by(conflict_id, year) |>
    summarise(best = sum(bd_best), low = sum(bd_low), high = sum(bd_high), .groups = "drop")

  links <- conflict_countries(acd)

  # One row per conflict: names from its latest year, plus its whole timeline
  timeline <- acd |>
    left_join(deaths, by = c("conflict_id", "year")) |>
    arrange(conflict_id, year)

  conflicts <- timeline |>
    group_by(conflict_id) |>
    summarise(
      location     = last(location),
      side_a       = last(side_a),
      side_b       = last(side_b),
      incompat     = unname(INCOMPAT[as.character(last(incompatibility))]),
      territory    = last(na.omit(territory_name)) %||% NA_character_,
      type         = unname(TYPE_KEYS[as.character(last(type_of_conflict))]),
      start        = as.character(min(as.Date(start_date), na.rm = TRUE)),
      first_year   = min(year),
      last_year    = max(year),
      # I() keeps a one-year conflict as a list in the JSON ([2025], not 2025)
      years        = list(I(year)),
      intensity    = list(I(intensity_level)),
      deaths       = list(I(best)),                      # NA before 1989
      deaths_total = if (all(is.na(best))) NA_real_ else sum(best, na.rm = TRUE),
      wars         = sum(intensity_level == 2),
      .groups = "drop"
    ) |>
    mutate(active = last_year == !!last_year) |>
    left_join(
      links |> group_by(conflict_id) |> summarise(countries = list(tibble(iso3, role)), .groups = "drop"),
      by = "conflict_id"
    )

  # The world, year by year: active conflicts by type (since 1946), deaths by kind of violence (since 1989)
  by_type <- acd |>
    distinct(year, conflict_id, type_of_conflict, intensity_level) |>
    mutate(type = TYPE_KEYS[as.character(type_of_conflict)]) |>
    count(year, type) |>
    pivot_wider(names_from = type, values_from = n, values_fill = 0) |>
    left_join(acd |> filter(intensity_level == 2) |> distinct(year, conflict_id) |> count(year, name = "wars"), by = "year") |>
    mutate(wars = coalesce(wars, 0L)) |>
    complete(year = full_seq(year, 1), fill = list(wars = 0L))
  for (k in TYPE_KEYS) if (!k %in% names(by_type)) by_type[[k]] <- 0L
  by_type <- by_type |> mutate(across(all_of(unname(TYPE_KEYS)), \(x) coalesce(x, 0L)))

  cy <- raw$cy |>
    mutate(iso3 = map_chr(country_id, \(g) gw_to_iso3(g)[1] %||% NA_character_)) |>
    transmute(iso3, year,
              sb = sb_total_deaths_best, sb_low = sb_total_deaths_low, sb_high = sb_total_deaths_high,
              ns = ns_total_deaths_best, os = os_total_deaths_best)

  deaths_world <- cy |>
    group_by(year) |>
    summarise(across(c(sb, sb_low, sb_high, ns, os), \(x) sum(x, na.rm = TRUE)), .groups = "drop")

  # Map: the latest year, per country
  active_here <- links |>
    filter(role == "location") |>
    inner_join(acd |> filter(year == last_year) |> select(conflict_id, intensity_level), by = "conflict_id") |>
    group_by(iso3) |>
    summarise(conflicts = n_distinct(conflict_id), max_intensity = max(intensity_level), .groups = "drop")
  map_latest <- cy |>
    filter(year == last_year, iso3 %in% valid_iso3) |>
    group_by(iso3) |>
    summarise(across(c(sb, ns, os), \(x) sum(x, na.rm = TRUE)), .groups = "drop") |>
    full_join(active_here |> filter(iso3 %in% valid_iso3), by = "iso3") |>
    mutate(across(c(sb, ns, os, conflicts, max_intensity), \(x) coalesce(x, 0))) |>
    filter(sb + ns + os > 0 | conflicts > 0)

  if (n_distinct(acd$conflict_id) < min_conflicts) {
    stop(sprintf("UCDP: only %d conflicts. Not writing anything.", n_distinct(acd$conflict_id)))
  }

  list(
    version = raw$version, year = last_year, first_year = min(acd$year),
    conflicts = conflicts, links = links, by_type = by_type, deaths_world = deaths_world, valid_iso3 = valid_iso3,
    cy = cy |> filter(iso3 %in% valid_iso3), map = map_latest,
    candidate = build_candidate(raw$candidate, raw$candidate_files, valid_iso3)
  )
}

# Preliminary events of the current year: monthly totals, totals per country, deadliest conflicts.
# Later releases correct earlier ones, so each event id keeps its newest version.
build_candidate <- function(events, files, valid_iso3) {
  if (is.null(events) || nrow(events) == 0) return(NULL)
  ev <- events |>
    mutate(order = match(release, files)) |>
    group_by(id) |>
    slice_max(order, n = 1, with_ties = FALSE) |>
    ungroup() |>
    mutate(month = substr(as.character(as.Date(date_start)), 1, 7),
           kind  = VIOLENCE[as.character(type_of_violence)],
           iso3  = map_chr(country_id, \(g) gw_to_iso3(g)[1] %||% NA_character_))

  wide <- \(df, ...) df |>
    group_by(..., kind) |>
    summarise(deaths = sum(best), events = n(), .groups = "drop_last") |>
    mutate(events = sum(events)) |>
    pivot_wider(names_from = kind, values_from = deaths, values_fill = 0) |>
    ungroup()
  fill_kinds <- \(df) { for (k in VIOLENCE) if (!k %in% names(df)) df[[k]] <- 0; df }

  list(
    files    = files,
    from     = as.character(min(as.Date(ev$date_start))),
    to       = as.character(max(as.Date(ev$date_end))),
    months   = wide(ev, month) |> fill_kinds() |> arrange(month),
    countries = wide(ev |> filter(iso3 %in% valid_iso3), iso3) |> fill_kinds() |>
      mutate(total = sb + ns + os) |> arrange(desc(total)),
    conflicts = ev |>
      group_by(conflict_new_id, conflict_name, kind) |>
      summarise(deaths = sum(best), events = n(), .groups = "drop") |>
      arrange(desc(deaths)) |>
      head(25)
  )
}

# ---------------------------------------------------------------------------
# Writing

write_conflicts <- function(cf) {
  out <- file.path(PATH_OUT, "conflicts")
  dir.create(file.path(out, "countries"), recursive = TRUE, showWarnings = FALSE)
  unlink(list.files(out, pattern = "\\.json$", full.names = TRUE, recursive = TRUE))

  w <- \(x, file) jsonlite::write_json(x, file.path(out, file),
                                       dataframe = "rows", na = "null", digits = NA, auto_unbox = TRUE)

  w(list(
    source = "UCDP, Uppsala Conflict Data Program", version = cf$version,
    year = cf$year, first_year = cf$first_year,
    active = sum(cf$conflicts$active), wars = sum(cf$conflicts$active & map_lgl(cf$conflicts$intensity, \(x) last(x) == 2)),
    by_type = cf$by_type, deaths = cf$deaths_world
  ), "summary.json")

  # Every conflict; country lists stay compact ([iso3, role] pairs become objects)
  w(cf$conflicts |> mutate(countries = map(countries, \(x) if (is.null(x)) list() else x)), "conflicts.json")
  w(list(year = cf$year, countries = cf$map), "map.json")
  if (!is.null(cf$candidate)) w(cf$candidate, "candidate.json")

  # One file per country: the conflicts it hosted or fought in, and its yearly deaths
  # every country we publish that hosted, fought in or supported a conflict, or had deaths since 1989
  countries <- sort(unique(c(cf$links$iso3[cf$links$iso3 %in% cf$valid_iso3], cf$cy$iso3)))
  for (iso in countries) {
    w(list(
      iso3 = iso,
      conflicts = cf$links |> filter(iso3 == iso) |> select(conflict_id, role),
      deaths = cf$cy |> filter(iso3 == iso) |> select(-iso3) |> arrange(year)
    ), file.path("countries", paste0(iso, ".json")))
  }
  message(sprintf("UCDP %s: %d conflicts (%d active in %d), %d countries written to %s",
                  cf$version, nrow(cf$conflicts), sum(cf$conflicts$active), cf$year, length(countries), out))
}
