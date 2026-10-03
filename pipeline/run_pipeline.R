# Fisális data pipeline — run with: source("run_pipeline.R")
library(readr)

source("R/paths.R")
source("R/countries.R")
source("R/fetch_wdi.R")
source("R/build.R")
source("R/validate_catalog.R")      # stops early if the catalog is broken
source("R/aggregates.R")

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

message("4b/5 Aggregates for blocs and continents")
methods    <- read_csv(file.path(PATH_CONFIG, "aggregation.csv"), show_col_types = FALSE)
bloc_list  <- read_csv(file.path(PATH_CONFIG, "blocs.csv"), show_col_types = FALSE) |>
  filter(status == "member")
members    <- group_members(bloc_list, countries)
group_data <- aggregate_groups(data |> filter(iso3 %in% countries$iso3), members, methods)
aggregates <- bind_rows(describe_official(aggregates), group_meta(members))
data_out   <- bind_rows(data, group_data |> select(iso3, year, value, code))

message("5/5 Writing JSON to ", PATH_OUT)
write_outputs(countries, aggregates, latest, data_out, ind_meta, map_summary)

message("Done.")