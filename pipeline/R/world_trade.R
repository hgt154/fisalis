# World trade in goods, by country and partner — IMF IMTS (formerly Direction of Trade Statistics)
#
# What it downloads (all values in US$):
#   - monthly totals with the World for every reporter, since 2010   -> historical series
#   - yearly totals with the World for every reporter, since 2000    -> yearly view and summary
#   - yearly values by partner for the last two years                -> partners treemap / map
# Exports are FOB (XG_FOB_USD). Imports are CIF (MG_CIF_USD), the way most countries report them,
# so imports here run a few % above FOB sources such as Comex Stat.
#
# Output: web/public/data/trade_world/index.json and one <ISO3>.json per economy (WLD = World).

library(dplyr)
library(tidyr)
library(purrr)
library(readr)

IMF_BASE   <- "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/IMTS/~"
IMF_FLOWS  <- c(XG_FOB_USD = "export", MG_CIF_USD = "import")
IMF_WORLD  <- "G001"                       # IMF code for the World; we publish it as WLD, like the WDI
IMF_KEY_FLOWS <- paste(names(IMF_FLOWS), collapse = "+")

# ---------------------------------------------------------------------------
# Downloading

# api.imf.org uses a certificate from Sectigo's new root (R46), missing from older certificate
# lists (macOS's openssl list, Ubuntu's 2024 list). curl publishes the current Mozilla list;
# we keep a copy in raw/ and refresh it monthly. Certificates are still checked, just against
# an up-to-date list.
ensure_ca_bundle <- function(path = file.path(PATH_RAW, "cacert.pem"), max_age_days = 30) {
  age <- if (file.exists(path)) difftime(Sys.time(), file.mtime(path), units = "days") else Inf
  if (age > max_age_days) {
    message("IMF: downloading an up-to-date list of trusted certificates")
    dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
    httr2::request("https://curl.se/ca/cacert.pem") |>
      httr2::req_timeout(60) |>
      httr2::req_perform(path = path)
  }
  path
}

# One request -> one tibble of raw rows. The key is COUNTRY.INDICATOR.COUNTERPART_COUNTRY.FREQUENCY;
# "*" = all values, "+" joins values. `from` must match the frequency: "2010-M01" or "2000-A".
imf_get <- function(key, from, cainfo) {
  started <- Sys.time()
  resp <- httr2::request(paste0(IMF_BASE, "/", key)) |>
    httr2::req_url_query(`c[TIME_PERIOD]` = paste0("ge:", from)) |>
    httr2::req_headers(Accept = "text/csv") |>
    httr2::req_user_agent("arco-global-affairs-data (github.com/hgt154/fisalis)") |>
    httr2::req_options(cainfo = cainfo) |>
    httr2::req_timeout(300) |>
    httr2::req_retry(max_tries = 4, retry_on_failure = TRUE, backoff = \(i) 10 * i) |>
    httr2::req_perform()

  df <- read_csv(I(httr2::resp_body_string(resp)),
                 col_types = cols(.default = col_character()), progress = FALSE)
  secs <- round(as.numeric(difftime(Sys.time(), started, units = "secs")))
  message(sprintf("IMF: %s (%s rows, %ss)", key, format(nrow(df), big.mark = ","), secs))
  df
}

# Keep only what we use, with friendly names. Drops the empty "header" rows the API sometimes adds.
parse_imts <- function(df) {
  df |>
    filter(!is.na(COUNTRY), !is.na(TIME_PERIOD), !is.na(OBS_VALUE), INDICATOR %in% names(IMF_FLOWS)) |>
    transmute(
      reporter = COUNTRY,
      partner  = COUNTERPART_COUNTRY,
      flow     = unname(IMF_FLOWS[INDICATOR]),
      period   = TIME_PERIOD,
      value    = as.numeric(OBS_VALUE)
    ) |>
    filter(!is.na(value))
}

# Re-use a download made in the last `max_age_days` (handy while developing; the monthly
# GitHub job starts from an empty raw/ folder anyway).
imf_cached <- function(name, fetch, max_age_days = 20) {
  file <- file.path(PATH_RAW, "imf", paste0(name, ".rds"))
  dir.create(dirname(file), recursive = TRUE, showWarnings = FALSE)
  if (file.exists(file) && difftime(Sys.time(), file.mtime(file), units = "days") < max_age_days) {
    return(readRDS(file))
  }
  df <- parse_imts(fetch())
  saveRDS(df, file)
  df
}

# Everything the page needs. `valid_iso3` = the countries we publish (from countries.json).
fetch_world_trade <- function(valid_iso3, partner_years = 2, batch_size = 20) {
  cainfo <- ensure_ca_bundle()

  monthly <- imf_cached("totals_monthly", \() imf_get(paste0("*.", IMF_KEY_FLOWS, ".", IMF_WORLD, ".M"), "2010-M01", cainfo))
  annual  <- imf_cached("totals_annual",  \() imf_get(paste0("*.", IMF_KEY_FLOWS, ".", IMF_WORLD, ".A"), "2000-A", cainfo))

  # Partners: the last `partner_years` years, reporters in batches (all at once times out)
  first_year <- as.integer(format(Sys.Date(), "%Y")) - partner_years
  reporters  <- c(IMF_WORLD, sort(intersect(unique(annual$reporter), valid_iso3)))
  batches    <- split(reporters, ceiling(seq_along(reporters) / batch_size))
  partners <- imap(batches, \(codes, i) {
    imf_cached(sprintf("partners_%d_%s", first_year, i), \() {
      Sys.sleep(1)   # be gentle with the API
      imf_get(paste0(paste(codes, collapse = "+"), ".", IMF_KEY_FLOWS, ".*.A"), paste0(first_year, "-A"), cainfo)
    })
  }) |> list_rbind()

  list(monthly = monthly, annual = annual, partners = partners)
}

# ---------------------------------------------------------------------------
# Shaping (no downloads here, so it can be tested)

# Names for partners that are not in countries.json (e.g. Taiwan), so the page can still label them
default_partner_names <- function(iso3) {
  tibble(
    iso3    = iso3,
    name_en = countrycode::countrycode(iso3, "iso3c", "country.name.en", warn = FALSE),
    name_pt = countrycode::countrycode(iso3, "iso3c", "cldr.name.pt", warn = FALSE),
    continent = countrycode::countrycode(iso3, "iso3c", "continent", warn = FALSE)   # colors the treemap
  ) |> filter(!is.na(name_en))
}

build_world_trade <- function(raw, valid_iso3, min_reporters = 150, name_lookup = default_partner_names) {
  to_code <- \(x) if_else(x == IMF_WORLD, "WLD", x)
  keep    <- c(valid_iso3, "WLD")

  totals <- \(df) df |>
    filter(partner == IMF_WORLD) |>
    mutate(reporter = to_code(reporter)) |>
    filter(reporter %in% keep)

  monthly <- totals(raw$monthly) |>
    mutate(date = sub("-M", "-", period)) |>                       # "2025-M01" -> "2025-01"
    select(reporter, date, flow, value) |>
    pivot_wider(names_from = flow, values_from = value)

  annual <- totals(raw$annual) |>
    mutate(year = as.integer(period)) |>
    select(reporter, year, flow, value) |>
    pivot_wider(names_from = flow, values_from = value)

  # Real countries only: 3-letter ISO codes. Groups (G001, GX170, TX910 ...) are longer.
  partners <- raw$partners |>
    mutate(reporter = to_code(reporter), year = as.integer(period)) |>
    filter(reporter %in% keep, grepl("^[A-Z]{3}$", partner), partner != reporter, value > 0) |>
    transmute(reporter, year, flow, iso3 = partner, value)

  # Safety net: a broken download must not replace good data with an almost empty site
  n_reporters <- n_distinct(annual$reporter)
  if (n_reporters < min_reporters || !"WLD" %in% annual$reporter) {
    stop(sprintf("IMF trade: only %d reporters (World included: %s). Not writing anything.",
                 n_reporters, "WLD" %in% annual$reporter))
  }

  for (col in c("export", "import")) {               # a reporter may only have one of the flows
    if (!col %in% names(monthly)) monthly[[col]] <- NA_real_
    if (!col %in% names(annual))  annual[[col]]  <- NA_real_
  }

  last_or_na <- \(x) if (length(x)) max(x) else NA
  index <- tibble(iso3 = sort(unique(c(monthly$reporter, annual$reporter)))) |>
    mutate(
      last_month = map_chr(iso3, \(r) last_or_na(monthly$date[monthly$reporter == r])),
      last_year  = map_int(iso3, \(r) as.integer(last_or_na(annual$year[annual$reporter == r]))),
      partners   = iso3 %in% partners$reporter
    )

  list(
    index         = index,
    partner_names = name_lookup(setdiff(unique(partners$iso3), valid_iso3)),
    monthly       = monthly,
    annual        = annual,
    partners      = partners
  )
}

# ---------------------------------------------------------------------------
# Writing

write_world_trade <- function(wt) {
  out <- file.path(PATH_OUT, "trade_world")
  dir.create(out, recursive = TRUE, showWarnings = FALSE)
  unlink(list.files(out, pattern = "\\.json$", full.names = TRUE))   # countries that disappeared go too

  w <- \(x, file) jsonlite::write_json(x, file.path(out, file),
                                       dataframe = "rows", na = "null", digits = NA, auto_unbox = TRUE)

  w(list(
    source        = "IMF, International Trade in Goods (IMTS)",
    updated       = format(Sys.Date()),
    economies     = wt$index,
    partner_names = wt$partner_names
  ), "index.json")

  # One small file per economy, values rounded to whole dollars
  for (r in wt$index$iso3) {
    w(list(
      iso3     = r,
      monthly  = wt$monthly  |> filter(reporter == r) |> arrange(date) |> select(date, export, import) |>
                   mutate(across(c(export, import), round)),
      annual   = wt$annual   |> filter(reporter == r) |> arrange(year) |> select(year, export, import) |>
                   mutate(across(c(export, import), round)),
      partners = wt$partners |> filter(reporter == r) |> arrange(year, flow, desc(value)) |>
                   select(year, flow, iso3, value) |> mutate(value = round(value))
    ), paste0(r, ".json"))
  }
  message(sprintf("IMF trade: wrote %d economies to %s", nrow(wt$index), out))
}
