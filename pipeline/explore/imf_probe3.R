# Probe 3: how to filter yearly data, and how long a batch of countries takes.
# Run from pipeline/:   Rscript explore/imf_probe3.R

library(httr2)
library(readr)
library(dplyr)

BASE <- "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/IMTS/~"

imf_get <- function(key, query = list()) {
  started <- Sys.time()
  resp <- request(paste0(BASE, "/", key)) |>
    req_url_query(!!!query) |>
    req_headers(Accept = "text/csv") |>
    req_user_agent("arco-global-affairs-data (github.com/hgt154/fisalis)") |>
    req_options(cainfo = "raw/cacert.pem") |>
    req_timeout(300) |>
    req_retry(max_tries = 4, retry_on_failure = TRUE, backoff = \(i) 5 * i) |>
    req_error(is_error = \(r) FALSE) |>
    req_perform()
  secs <- round(as.numeric(difftime(Sys.time(), started, units = "secs")), 1)
  if (resp_status(resp) != 200) {
    message(sprintf("  HTTP %s in %ss: %s", resp_status(resp), secs, substr(resp_body_string(resp), 1, 300)))
    return(NULL)
  }
  df <- read_csv(I(resp_body_string(resp)), show_col_types = FALSE, guess_max = 1e5,
                 col_types = cols(TIME_PERIOD = col_character(), .default = col_guess()))
  message(sprintf("  HTTP 200 in %ss, %s rows, periods %s to %s",
                  secs, nrow(df), min(df$TIME_PERIOD), max(df$TIME_PERIOD)))
  df
}

# --- Check A: which way of writing the yearly filter works? ---------------------
key <- "BRA.XG_FOB_USD.G001.A"
message("A1: c[TIME_PERIOD]=ge:2015")
invisible(imf_get(key, list(`c[TIME_PERIOD]` = "ge:2015")))
message("A2: c[TIME_PERIOD]=ge:2015-A")
invisible(imf_get(key, list(`c[TIME_PERIOD]` = "ge:2015-A")))
message("A3: startPeriod=2015")
invisible(imf_get(key, list(startPeriod = "2015")))
message("A4: no filter (for comparison)")
invisible(imf_get(key))

# --- Check B: one batch of 10 countries x every partner, exports + imports -------
batch <- c("BRA", "ARG", "CHN", "USA", "DEU", "IND", "ZAF", "NGA", "FRA", "JPN")
message("B1: 10 countries x all partners, yearly, all years")
b1 <- imf_get(paste0(paste(batch, collapse = "+"), ".XG_FOB_USD+MG_CIF_USD.*.A"))
message("B2: same, monthly since 2024-M01")
b2 <- imf_get(paste0(paste(batch, collapse = "+"), ".XG_FOB_USD+MG_CIF_USD.*.M"),
              list(`c[TIME_PERIOD]` = "ge:2024-M01"))
if (!is.null(b1)) cat("\nB1 size:", format(object.size(b1), units = "MB"), "\n")
if (!is.null(b2)) cat("B2 size:", format(object.size(b2), units = "MB"), "\n")