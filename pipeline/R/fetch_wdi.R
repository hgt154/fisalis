library(dplyr)
library(tidyr)
library(purrr)

# Download ONE indicator for all economies, return long format.
# Retries on failure; returns NULL if it keeps failing.
fetch_one <- function(code, start = START_YEAR, tries = 3) {
  for (i in seq_len(tries)) {
    result <- tryCatch(
      WDI::WDI(country = "all", indicator = code, start = start),
      error = function(e) {
        message("  attempt ", i, " failed for ", code, ": ", conditionMessage(e))
        NULL
      }
    )
    if (!is.null(result) && nrow(result) > 0) {
      return(
        result |>
          select(iso3 = iso3c, year, value = all_of(code)) |>
          mutate(code = code) |>
          filter(!is.na(value), iso3 != "")
      )
    }
    Sys.sleep(2 * i)   # wait a bit longer after each failure
  }
  warning("Giving up on ", code)
  NULL
}

# Download every indicator in the catalog, with a local cache.
fetch_all <- function(codes, use_cache = TRUE) {
  options(timeout = 180)   # give slow API responses more time
  dir.create(PATH_RAW, showWarnings = FALSE)
  cache_file <- file.path(PATH_RAW, "wdi_long.rds")
  
  if (use_cache && file.exists(cache_file)) {
    message("Using cached data from ", cache_file)
    return(readRDS(cache_file))
  }
  
  data <- map(codes, \(code) {
    message("Fetching ", code)
    fetch_one(code)
  }) |> list_rbind()
  
  saveRDS(data, cache_file)
  data
}