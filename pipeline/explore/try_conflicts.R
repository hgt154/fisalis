# Try the conflicts step on its own, before adding it to run_pipeline.R
# Run from the pipeline/ folder:   Rscript explore/try_conflicts.R

source("R/paths.R")
source("R/world_trade.R")     # for ensure_ca_bundle()
source("R/conflicts.R")

countries <- jsonlite::read_json(file.path(PATH_OUT, "countries.json"), simplifyVector = TRUE)

raw <- fetch_conflicts()
cf  <- build_conflicts(raw, countries$iso3)
write_conflicts(cf)

# --- Report -----------------------------------------------------------------------------
cat("\nVersion", cf$version, "|", cf$first_year, "to", cf$year, "|", nrow(cf$conflicts), "conflicts,",
    sum(cf$conflicts$active), "active in", cf$year, "\n")

cat("\nActive conflicts by type, last 5 years:\n")
print(tail(cf$by_type, 5))

cat("\nDeadliest active conflicts in", cf$year, ":\n")
cf$conflicts |>
  dplyr::filter(active) |>
  dplyr::mutate(deaths_latest = purrr::map_dbl(deaths, dplyr::last),
                countries = purrr::map_chr(countries, \(x) paste(x$iso3, collapse = " "))) |>
  dplyr::arrange(dplyr::desc(deaths_latest)) |>
  dplyr::select(conflict_id, location, type, deaths_latest, countries) |>
  head(8) |> print(width = 120)

cat("\nCountries on the map:", nrow(cf$map), "| conflicts with no country we publish:",
    sum(purrr::map_int(cf$conflicts$countries, \(x) if (is.null(x)) 0L else sum(x$iso3 %in% countries$iso3)) == 0), "\n")

cat("\nPreliminary", cf$candidate$from, "to", cf$candidate$to, "from", paste(cf$candidate$files, collapse = " + "), "\n")
print(cf$candidate$months)

out   <- file.path(PATH_OUT, "conflicts")
files <- list.files(out, recursive = TRUE, full.names = TRUE)
cat("\nFiles:", length(files), "| total size:", round(sum(file.size(files)) / 1e6, 2), "MB\n")
