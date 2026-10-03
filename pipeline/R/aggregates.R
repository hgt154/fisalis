# Aggregates for groups the World Bank does not publish: blocs (BRICS, Mercosur, G20...)
# and continents. The European Union is NOT calculated here: WDI publishes it (code EUU).
#
# How each indicator is combined is set in config/aggregation.csv:
#   sum   total of the members (population, GDP...) — only when EVERY member has data that year
#   pop   average weighted by population (life expectancy, % of population, per-capita values...)
#   gdp   average weighted by GDP (% of GDP, growth, inflation...)
#   none  not aggregated (indices, scores, inequality, shares that need a weight we don't have)
#
# Weighted averages are kept only when the members with data cover at least MIN_COVERAGE
# of the group's total weight in that year. Membership is the CURRENT one, for every year.

library(dplyr)

MIN_COVERAGE <- 2 / 3
WEIGHT_CODES <- c(pop = "SP.POP.TOTL", gdp = "NY.GDP.MKTP.CD")
ALLOWED_METHODS <- c("sum", "pop", "gdp", "none")
OFFICIAL_BLOCS <- c("European Union" = "EUU")   # published by the World Bank, not calculated

# "BRICS" -> "BLOC-BRICS", "African Union" -> "BLOC-AFRICAN-UNION", "Americas" -> "CONT-AMERICAS"
group_code <- function(name, prefix) {
  paste0(prefix, "-", toupper(gsub("(^-|-$)", "", gsub("[^A-Za-z0-9]+", "-", name))))
}

# Who belongs to which group.
#   blocs:     iso3, bloc  (active members only, as in config/blocs.csv after filtering)
#   countries: iso3, continent
# Returns one row per member: group (code), name_en, type ("bloc" / "continent"), iso3
group_members <- function(blocs, countries) {
  bloc_rows <- blocs |>
    filter(!bloc %in% names(OFFICIAL_BLOCS)) |>
    transmute(group = group_code(bloc, "BLOC"), name_en = bloc, type = "bloc", iso3)

  continent_rows <- countries |>
    filter(!is.na(continent), continent != "Other") |>
    transmute(group = group_code(continent, "CONT"), name_en = continent, type = "continent", iso3)

  bind_rows(bloc_rows, continent_rows) |> distinct()
}

# The calculation.
#   data:    iso3, code, year, value   (country values, long format)
#   members: group, iso3               (from group_members())
#   methods: code, aggregation         (config/aggregation.csv)
# Returns: iso3 (= group code), code, year, value, coverage (share of the weight with data)
aggregate_groups <- function(data, members, methods, min_coverage = MIN_COVERAGE) {
  bad <- setdiff(methods$aggregation, ALLOWED_METHODS)
  if (length(bad) > 0) stop("Unknown aggregation method(s): ", paste(bad, collapse = ", "))

  members <- distinct(members, group, iso3)
  n_members <- count(members, group, name = "n_members")

  # Every member value, with its group and its method
  values <- data |>
    filter(!is.na(value)) |>
    inner_join(methods |> filter(aggregation != "none") |> select(code, aggregation), by = "code") |>
    inner_join(members, by = "iso3", relationship = "many-to-many")

  # --- sums: only when all members report -----------------------------------
  sums <- values |>
    filter(aggregation == "sum") |>
    group_by(group, code, year) |>
    summarise(value = sum(value), reporting = n_distinct(iso3), .groups = "drop") |>
    inner_join(n_members, by = "group") |>
    filter(reporting == n_members) |>
    transmute(group, code, year, value, coverage = 1)

  # --- weighted averages ------------------------------------------------------
  weights <- data |>
    filter(code %in% WEIGHT_CODES, !is.na(value), value > 0) |>
    transmute(iso3, year, weight_type = names(WEIGHT_CODES)[match(code, WEIGHT_CODES)], weight = value)

  # Total weight of each group per year (all members that have a weight)
  group_weight <- members |>
    inner_join(weights, by = "iso3", relationship = "many-to-many") |>
    group_by(group, weight_type, year) |>
    summarise(total_weight = sum(weight), .groups = "drop")

  means <- values |>
    filter(aggregation %in% c("pop", "gdp")) |>
    inner_join(weights, by = c("iso3", "year", "aggregation" = "weight_type")) |>
    group_by(group, code, year, aggregation) |>
    summarise(value = sum(value * weight) / sum(weight), covered = sum(weight), .groups = "drop") |>
    inner_join(group_weight, by = c("group", "year", "aggregation" = "weight_type")) |>
    mutate(coverage = covered / total_weight) |>
    filter(coverage >= min_coverage) |>
    transmute(group, code, year, value, coverage)

  bind_rows(sums, means) |>
    rename(iso3 = group) |>
    arrange(iso3, code, year)
}

# Rows for aggregates.json: official World Bank aggregates are added elsewhere;
# these describe the calculated ones (the website labels them "calculated by Arco")
group_meta <- function(members) {
  members |>
    distinct(group, name_en, type) |>
    transmute(iso3 = group, name_en, kind = "calculated", type,
              bloc = if_else(type == "bloc", name_en, NA_character_),
              continent = if_else(type == "continent", name_en, NA_character_))
}

# World Bank aggregates (from get_aggregates()): mark them as official, and tell the
# website which one stands for a bloc (EUU = "European Union")
describe_official <- function(aggregates) {
  aggregates |>
    mutate(kind = "official",
           type = if_else(iso3 %in% OFFICIAL_BLOCS, "bloc", "world_bank"),
           bloc = names(OFFICIAL_BLOCS)[match(iso3, OFFICIAL_BLOCS)],
           continent = NA_character_)
}
