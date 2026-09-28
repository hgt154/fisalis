library(dplyr)
library(tidyr)
library(purrr)

MESES <- c("Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho",
           "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro")

# The three periods the page offers, relative to the latest month
define_periods <- function(latest) {
  y <- as.integer(format(latest, "%Y"))
  m <- as.integer(format(latest, "%m"))
  tibble(
    period = c("month", "ytd", "year"),
    label  = c(sprintf("%s %d", MESES[m], y), sprintf("Jan–%s %d", substr(MESES[m], 1, 3), y), as.character(y - 1)),
    year   = c(y, y, y - 1),
    m_from = c(m, 1, 1),
    m_to   = c(m, m, 12)
  )
}

# Value in each period + same period one year earlier, grouped by `by`,
# with share of the total and year-over-year change
summarise_periods <- function(df, periods, by = character()) {
  pmap(periods, function(period, label, year, m_from, m_to) {
    total_in <- function(y, name) {
      df |>
        filter(.data$year == y, month >= m_from, month <= m_to) |>
        group_by(flow, across(all_of(by))) |>
        summarise("{name}" := sum(fob), .groups = "drop")
    }
    full_join(total_in(year, "value"), total_in(year - 1, "prev"), by = c("flow", by)) |>
      mutate(period = period, value = coalesce(value, 0), prev = coalesce(prev, 0))
  }) |>
    list_rbind() |>
    group_by(period, flow) |>
    mutate(
      share   = value / sum(value),
      var_abs = value - prev,
      var_pct = if_else(prev > 0, value / prev - 1, NA_real_)
    ) |>
    ungroup()
}

# The four summary cards: exports, imports, total trade (corrente), balance (saldo)
build_summary <- function(total, periods) {
  base <- summarise_periods(total, periods) |> select(period, flow, value, prev)
  wide <- base |> pivot_wider(names_from = flow, values_from = c(value, prev))
  bind_rows(
    base,
    wide |> transmute(period, flow = "corrente", value = value_export + value_import, prev = prev_export + prev_import),
    wide |> transmute(period, flow = "saldo",    value = value_export - value_import, prev = prev_export - prev_import)
  ) |>
    mutate(var_pct = if_else(flow != "saldo" & prev > 0, value / prev - 1, NA_real_)) |>
    left_join(periods |> select(period, label), by = "period")
}

# Monthly totals for the historical chart: one row per month
build_series_total <- function(total) {
  total |>
    group_by(year, month, flow) |>
    summarise(value = sum(fob), .groups = "drop") |>
    pivot_wider(names_from = flow, values_from = value, values_fill = 0) |>
    arrange(year, month) |>
    transmute(date = sprintf("%d-%02d", year, month), export, import)
}

# Monthly totals by ISIC section (the "Setores" option of the chart)
build_series_isic <- function(products) {
  products |>
    group_by(year, month, flow, section) |>
    summarise(value = sum(fob), .groups = "drop") |>
    arrange(year, month) |>
    transmute(date = sprintf("%d-%02d", year, month), flow, section, value)
}

# Monthly series (US$ and kg) for the top products of each flow
build_product_series <- function(products, periods, top = 50) {
  last_year <- periods$year[periods$period == "year"]
  top_codes <- products |>
    filter(year == last_year) |>
    group_by(flow, product_code) |>
    summarise(value = sum(fob), .groups = "drop") |>
    group_by(flow) |>
    slice_max(value, n = top) |>
    ungroup()
  
  products |>
    semi_join(top_codes, by = c("flow", "product_code")) |>
    group_by(flow, product_code, product, year, month) |>
    summarise(fob = sum(fob), kg = sum(kg), .groups = "drop") |>
    arrange(year, month) |>
    group_by(flow, product_code, product) |>
    summarise(
      dates = list(I(sprintf("%d-%02d", year, month))),   # I() keeps even one value as a JSON list
      fob   = list(I(fob)),
      kg    = list(I(kg)),
      .groups = "drop"
    )
}

# Country names from Comex (Portuguese) -> ISO3 and continent, via the official table
add_country_codes <- function(partners, comex_countries) {
  lookup <- comex_countries |>
    transmute(country = NO_PAIS, iso3 = CO_PAIS_ISOA3) |>
    distinct(country, .keep_all = TRUE)
  
  partners |>
    left_join(lookup, by = "country") |>
    mutate(continent = countrycode::countrycode(iso3, "iso3c", "continent", warn = FALSE))
}

# State names from Comex -> two-letter code (SP, MG ...) used by the Brazil map
add_state_codes <- function(states, comex_states) {
  states |> left_join(comex_states |> select(state = text, uf), by = "state")
}

write_trade_outputs <- function(latest, periods, summary, series_total, series_isic,
                                partners, states, products, product_series) {
  out <- file.path(PATH_OUT, "trade")
  dir.create(out, recursive = TRUE, showWarnings = FALSE)
  
  w <- \(x, file) jsonlite::write_json(x, file.path(out, file),
                                       dataframe = "rows", na = "null",
                                       digits = NA, auto_unbox = TRUE)
  
  w(list(latest = format(latest, "%Y-%m"), periods = periods), "meta.json")
  w(summary,        "summary.json")
  w(series_total,   "series_total.json")
  w(series_isic,    "series_isic.json")
  w(partners,       "partners.json")
  w(states,         "states.json")
  w(products,       "products.json")
  w(product_series, "product_series.json")
}