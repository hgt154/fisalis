library(dplyr)
library(purrr)

# Be gentle with the API: wait longer after a "too many requests" error
options(comexr.retry_time = 15, comexr.timeout = 180)

# Column names the API returns -> the names we use everywhere else.
# CHECK THESE in Step 2 with names(...) and fix any that differ.
COMEX_COLS <- c(
  year         = "year",
  month        = "monthNumber",
  fob          = "metricFOB",
  kg           = "metricKG",
  country      = "country",
  state        = "state",
  product_code = "coSITCGroup",
  product      = "SITCGroup",
  section_code = "coIsicSection",
  section      = "ISICSection"
)

standardize <- function(df) {
  present <- COMEX_COLS[COMEX_COLS %in% names(df)]
  df |>
    rename(any_of(present)) |>
    mutate(across(any_of(c("year", "month", "fob", "kg")), as.numeric))
}

# Most recent month with published data, e.g. as.Date("2026-08-01")
comex_latest_month <- function() {
  u <- comexr::comex_last_update()
  if (is.null(u$year) || is.null(u$monthNumber)) {
    stop("Unexpected comex_last_update() format. Inspect it with str(comexr::comex_last_update())")
  }
  as.Date(sprintf("%s-%02d-01", u$year, as.integer(u$monthNumber)))
}

# One flow, one year, grouped by `details`, monthly. Cached on disk:
# past years are downloaded once; the latest year is refreshed every run.
comex_year <- function(flow, year, details, latest) {
  dir.create(file.path(PATH_RAW, "comex"), recursive = TRUE, showWarnings = FALSE)
  file <- file.path(PATH_RAW, "comex", sprintf("%s_%s_%d.rds", flow, paste(details, collapse = "-"), year))
  latest_year <- as.integer(format(latest, "%Y"))
  
  if (file.exists(file) && year < latest_year) return(readRDS(file))
  
  end <- if (year == latest_year) format(latest, "%Y-%m") else sprintf("%d-12", year)
  message("Comex: ", flow, " ", paste(details, collapse = "+"), " ", year)
  df <- NULL
  for (attempt in 1:4) {
    df <- tryCatch(
      comexr::comex_query(
        flow = flow, start_period = sprintf("%d-01", year), end_period = end,
        details = details, month_detail = TRUE, metric_kg = TRUE,
        language = "pt", verbose = FALSE
      ),
      error = function(e) {
        message("  attempt ", attempt, " failed: ", conditionMessage(e), " — waiting 15 s")
        Sys.sleep(15)
        NULL
      }
    )
    if (!is.null(df)) break
  }
  if (is.null(df)) stop("Comex query failed 4 times: ", flow, " ", year)
  df <- df |> standardize() |> mutate(flow = flow)
  
  saveRDS(df, file)
  Sys.sleep(1)   # pause between requests
  df
}

# Both flows, several years, stacked into one table
comex_range <- function(details, from_year, latest) {
  years <- seq(from_year, as.integer(format(latest, "%Y")))
  map(c("export", "import"), \(flow) map(years, \(y) comex_year(flow, y, details, latest)) |> list_rbind()) |>
    list_rbind()
}