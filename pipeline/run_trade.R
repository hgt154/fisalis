# Fisális — Brazilian foreign trade pipeline. Run with: source("run_trade.R")
library(readr)

source("R/paths.R")
source("R/geometry.R")
source("R/comex.R")
source("R/comex_build.R")

FROM_YEAR <- 2016

message("1/5 Latest month")
latest  <- comex_latest_month()
periods <- define_periods(latest)
recent  <- as.integer(format(latest, "%Y")) - 2      # partners and states: last 3 years

message("2/5 Downloading (cached years are skipped)")
products  <- comex_range(c("sitc_group", "isic_section"), FROM_YEAR, latest)
countries <- comex_range("country", recent, latest)
states    <- comex_range("state",   recent, latest)

message("3/5 Reference tables")
comex_countries <- read_delim(file.path(PATH_CONFIG, "comex_countries.csv"), delim = ";",
                              locale = locale(encoding = "latin1"), show_col_types = FALSE)
comex_states    <- comexr::comex_states()

message("4/5 Building tables")
summary        <- build_summary(products, periods)
series_total   <- build_series_total(products)
series_isic    <- build_series_isic(products)
partners       <- summarise_periods(countries, periods, by = "country") |> add_country_codes(comex_countries)
state_table    <- summarise_periods(states, periods, by = "state") |> add_state_codes(comex_states)
product_table  <- summarise_periods(products, periods, by = c("product_code", "product", "section_code", "section"))
product_series <- build_product_series(products, periods)

message("5/5 Writing JSON")
write_trade_outputs(latest, periods, summary, series_total, series_isic,
                    partners, state_table, product_table, product_series)

if (!file.exists(file.path(PATH_OUT, "brazil.topo.json"))) export_brazil(build_brazil_states())

message("Done. Latest month: ", format(latest, "%Y-%m"))