# Yearly step: products by country from CEPII BACI (new release every January).
# Run from the pipeline/ folder:   Rscript run_products.R
# First run: downloads ~2.4 GB (if not in raw/baci/ yet) and reads 30 years (~10 min).
# Later runs reuse the yearly totals saved in raw/baci/, so they take seconds.

source("R/paths.R")
source("R/world_trade.R")      # for ensure_ca_bundle()
source("R/world_products.R")

countries <- jsonlite::read_json(file.path(PATH_OUT, "countries.json"), simplifyVector = TRUE)
chapters  <- readr::read_csv(file.path(PATH_CONFIG, "hs_chapters.csv"), col_types = "cccc")
groups    <- readr::read_csv(file.path(PATH_CONFIG, "hs_groups.csv"), col_types = "cicc")

stopifnot(
  "hs_chapters.csv: every group must exist in hs_groups.csv" = all(chapters$group %in% groups$group),
  "hs_chapters.csv: chapters must be two digits" = all(grepl("^\\d{2}$", chapters$chapter))
)

message("1/3 BACI file")
baci <- baci_zip()

message("2/3 Reading every year (cached after the first run)")
agg <- aggregate_baci(baci)

message("3/3 Writing trade_products/")
wp <- build_world_products(agg, chapters, groups, countries$iso3)
write_world_products(wp)

# Quick look
cat("\nRelease", wp$version, "|", wp$first_year, "to", wp$year, "|", nrow(wp$economies), "economies\n")
print(wp$economies |> dplyr::filter(iso3 %in% c("WLD", "BRA", "CHN", "DEU", "NGA", "CHL")) |>
        dplyr::mutate(exports_bn = round(exports / 1e9, 1), hhi = round(hhi, 3)) |>
        dplyr::select(iso3, exports_bn, hhi))
