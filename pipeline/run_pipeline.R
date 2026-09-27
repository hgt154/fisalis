# Fisális data pipeline — run with: source("run_pipeline.R")
library(readr)

source("R/paths.R")
source("R/countries.R")
source("R/fetch_wdi.R")
source("R/build.R")
source("R/validate_catalog.R")      # stops early if the catalog is broken

message("1/5 Reading catalog")
ind    <- read_csv(file.path(PATH_CONFIG, "indicators.csv"),       show_col_types = FALSE)
groups <- read_csv(file.path(PATH_CONFIG, "indicator_groups.csv"), show_col_types = FALSE)

message("2/5 Country metadata")
countries  <- get_countries()
aggregates <- get_aggregates()

message("3/5 Downloading indicators")
data <- fetch_all(ind$code, use_cache = TRUE)

message("4/5 Building tables")
latest      <- build_latest(data)
map_summary <- build_map_summary(countries, latest)
ind_meta    <- build_indicator_meta(ind, groups)

message("5/5 Writing JSON to ", PATH_OUT)
write_outputs(countries, aggregates, latest, data, ind_meta, map_summary)

message("Done.")