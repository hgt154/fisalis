# Probe the UCDP downloads (Uppsala Conflict Data Program) before building the conflicts step.
# Run from the pipeline/ folder:   Rscript explore/ucdp_probe.R
# Downloads ~6 small files into raw/ucdp/ (ignored by git) and prints what is inside. Nothing goes to the site.

library(httr2)
library(readr)
library(dplyr)

dir.create("raw/ucdp", recursive = TRUE, showWarnings = FALSE)
if (!file.exists("raw/cacert.pem")) download.file("https://curl.se/ca/cacert.pem", "raw/cacert.pem", quiet = TRUE)

BASE <- "https://ucdp.uu.se/downloads"
FILES <- c(
  acd       = "ucdpprio/ucdp-prio-acd-261-csv.zip",               # every armed conflict, every year, 1946-2025
  brd       = "brd/ucdp-brd-dyadic-261-csv.zip",                  # battle-related deaths, 1989-2025
  cy        = "organizedviolencecy/organizedviolencecy-261-csv.zip", # country-year summary
  nonstate  = "nsos/ucdp-nonstate-261-csv.zip",
  onesided  = "nsos/ucdp-onesided-261-csv.zip",
  candidate = "candidateged/GEDEvent_v26_0_8.csv"                 # preliminary monthly events, 2026
)

# Download once, then read the CSV (inside the zip, if it is one)
get <- function(name) {
  path <- file.path("raw/ucdp", basename(FILES[[name]]))
  if (!file.exists(path)) {
    started <- Sys.time()
    request(paste0(BASE, "/", FILES[[name]])) |>
      req_options(cainfo = "raw/cacert.pem") |>
      req_timeout(600) |>
      req_retry(max_tries = 3, retry_on_failure = TRUE) |>
      req_perform(path = path)
    message(sprintf("Downloaded %s (%.1f MB, %ss)", basename(path), file.size(path) / 1e6,
                    round(difftime(Sys.time(), started, units = "secs"))))
  }
  if (grepl("\\.zip$", path)) {
    inside <- unzip(path, list = TRUE)$Name
    csv <- grep("\\.csv$", inside, value = TRUE)[1]
    unzip(path, files = csv, exdir = tempdir())
    path <- file.path(tempdir(), csv)
  }
  read_csv(path, show_col_types = FALSE, guess_max = 1e5)
}

show <- function(df, title) {
  cat("\n\n=====", title, "=====\n")
  cat(format(nrow(df), big.mark = ","), "rows\n")
  cat("Columns:", paste(names(df), collapse = ", "), "\n")
}

# --- 1. Armed conflicts (UCDP/PRIO) ----------------------------------------------------
acd <- get("acd")
show(acd, "UCDP/PRIO Armed Conflict Dataset 26.1")
cat("Years:", min(acd$year), "to", max(acd$year), "| conflicts ever:", n_distinct(acd$conflict_id), "\n")
cat("\nActive conflicts in", max(acd$year), "by type (1 extrasystemic, 2 interstate, 3 intrastate, 4 internationalized intrastate)",
    "and intensity (1 = 25-999 deaths, 2 = 1000+):\n")
acd |> filter(year == max(year)) |> count(type_of_conflict, intensity_level) |> print()
cat("\nSome rows from", max(acd$year), ":\n")
acd |> filter(year == max(year), intensity_level == 2) |>
  select(conflict_id, location, side_a, side_b, type_of_conflict, gwno_loc, gwno_a, gwno_b) |>
  head(8) |> print(width = Inf)

# Can every country code be turned into an ISO3 code (to link with the rest of the site)?
gw <- unique(unlist(strsplit(as.character(acd$gwno_loc), ",\\s*")))
iso <- countrycode::countrycode(as.integer(gw), "gwn", "iso3c", warn = FALSE)
cat("\nLocation codes (Gleditsch-Ward):", length(gw), "| without an ISO3 match:",
    paste(gw[is.na(iso)], collapse = " "), "\n")

# --- 2. Battle-related deaths -----------------------------------------------------------
brd <- get("brd")
show(brd, "Battle-related deaths (dyadic) 26.1")
cat("Years:", min(brd$year), "to", max(brd$year), "\n")
cat("Deadliest conflicts in", max(brd$year), "(best estimate, with low-high range):\n")
brd |> filter(year == max(year)) |>
  group_by(conflict_id, location_inc) |>
  summarise(best = sum(bd_best), low = sum(bd_low), high = sum(bd_high), .groups = "drop") |>
  arrange(desc(best)) |> head(8) |> print(width = Inf)
cat("World battle deaths per year (last 6):\n")
brd |> group_by(year) |> summarise(best = sum(bd_best)) |> tail(6) |> print()

# --- 3. Country-year summary --------------------------------------------------------------
cy <- get("cy")
show(cy, "Country-year organized violence 26.1")
print(head(cy, 3), width = Inf)

# --- 4. Non-state conflict and one-sided violence (the other two kinds UCDP counts) -------
ns <- get("nonstate");  show(ns, "Non-state conflict 26.1");   cat("Years:", min(ns$year), "to", max(ns$year), "\n")
os <- get("onesided");  show(os, "One-sided violence 26.1");   cat("Years:", min(os$year), "to", max(os$year), "\n")

# --- 5. Preliminary monthly events (GED Candidate) ----------------------------------------
cand <- get("candidate")
show(cand, "GED Candidate 26.0.8 (preliminary events)")
cat("Event dates:", format(min(as.Date(cand$date_start))), "to", format(max(as.Date(cand$date_end))), "\n")
cat("By type of violence (1 state-based, 2 non-state, 3 one-sided) and deaths (best):\n")
cand |> group_by(type_of_violence) |> summarise(events = n(), deaths = sum(best)) |> print()
cat("Countries with most deaths:\n")
cand |> group_by(country) |> summarise(events = n(), deaths = sum(best), .groups = "drop") |>
  arrange(desc(deaths)) |> head(10) |> print()
