# The website never sees the big long table. It gets small tables, each shaped for a job

library(dplyr)
library(tidyr)
library(purrr)
library(tibble)

# 6a. Most recent non-missing value for each economy x indicator
build_latest <- function(data) {
  data |>
    group_by(iso3, code) |>
    slice_max(year, n = 1) |>
    ungroup() |>
    select(iso3, code, year, value)
}

# 6b. All years for ONE economy, shaped as { code: [[year, value], ...] }
build_series_one <- function(df) {
  df |>
    arrange(code, year) |>
    split(~ code) |>
    map(\(d) unname(as.matrix(d[, c("year", "value")])))
}

# 6c. One row per country with the numbers the map tooltip needs
build_map_summary <- function(countries, latest) {
  wide <- latest |>
    filter(code %in% c("SP.POP.TOTL", "NY.GDP.MKTP.CD", "NY.GDP.PCAP.CD")) |>
    select(iso3, code, value) |>
    pivot_wider(names_from = code, values_from = value)
  
  countries |>
    left_join(wide, by = "iso3") |>
    rename(any_of(c(population = "SP.POP.TOTL",
                    gdp        = "NY.GDP.MKTP.CD",
                    gdp_pc     = "NY.GDP.PCAP.CD")))
}

# 6d. Catalog for the website: names + official definitions + groups
build_indicator_meta <- function(ind, groups) {
  defs <- WDI::WDIcache()$series |>
    select(code = indicator, description) |>
    distinct(code, .keep_all = TRUE)
  
  ind |>
    left_join(defs, by = "code") |>
    left_join(
      groups |>
        group_by(code) |>
        summarise(groups = list(tibble(view, group, order))),
      by = "code"
    )
}

# Helper: make sure "blocs" is always a JSON array, e.g. ["Mercosur"] or []
keep_bloc_arrays <- function(df) {
  df |> mutate(blocs = map(blocs, \(x) I(if (is.null(x)) character(0) else x)))
}

# 6e. Write everything the website needs
write_outputs <- function(countries, aggregates, latest, data, ind_meta, map_summary) {
  out <- PATH_OUT
  dir.create(file.path(out, "series"), recursive = TRUE, showWarnings = FALSE)
  
  w <- \(x, file) jsonlite::write_json(x, file.path(out, file),
                                       dataframe = "rows", na = "null",
                                       digits = NA, auto_unbox = TRUE)
  
  w(keep_bloc_arrays(countries),   "countries.json")
  w(aggregates,                    "aggregates.json")
  w(ind_meta,                      "indicators.json")
  w(latest,                        "latest.json")
  w(keep_bloc_arrays(map_summary), "map_summary.json")
  w(list(updated = format(Sys.time(), "%Y-%m-%d")), "meta.json")
  
  data |>
    split(~ iso3) |>
    iwalk(\(df, iso) w(build_series_one(df), file.path("series", paste0(iso, ".json"))))
}