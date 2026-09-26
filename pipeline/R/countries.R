library(dplyr)
library(readr)

get_countries <- function() {
  meta <- WDI::WDIcache()$country
  
  countries <- meta |>
    filter(region != "Aggregates") |>
    transmute(
      iso3      = iso3c,
      name_en   = country,
      region    = region,
      income    = income,
      capital   = capital,
      lat       = as.numeric(latitude),
      lon       = as.numeric(longitude),
      continent = countrycode::countrycode(iso3c, "iso3c", "continent", warn = FALSE)
    )
  
  blocs <- read_csv(file.path(PATH_CONFIG, "blocs.csv"), show_col_types = FALSE) |>
    filter(status == "member") |>            # filter so only active members count
    group_by(iso3) |>
    summarise(blocs = list(bloc))          # a list column: c("Mercosur", "BRICS")
  
  countries |>
    left_join(blocs, by = "iso3") |>
    mutate(continent = case_when(       # fix the few rows countrycode can't map
      iso3 == "XKX" ~ "Europe",
      iso3 == "CHI" ~ "Europe",
      TRUE ~ continent
    ))
}

get_aggregates <- function() {
  WDI::WDIcache()$country |>
    filter(region == "Aggregates") |>
    transmute(iso3 = iso3c, name_en = country)
}

