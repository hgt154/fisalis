# Tests for R/aggregates.R — run with testthat::test_dir("tests/testthat")
source(file.path("..", "..", "R", "aggregates.R"), chdir = TRUE)

# Three countries in one bloc; population A=100, B=300, C=600; GDP A=10, B=30, C=60
data <- tibble::tribble(
  ~iso3, ~code,            ~year, ~value,
  "AAA", "SP.POP.TOTL",    2020, 100,
  "BBB", "SP.POP.TOTL",    2020, 300,
  "CCC", "SP.POP.TOTL",    2020, 600,
  "AAA", "NY.GDP.MKTP.CD", 2020, 10,
  "BBB", "NY.GDP.MKTP.CD", 2020, 30,
  "CCC", "NY.GDP.MKTP.CD", 2020, 60,
  "AAA", "LIFE",           2020, 70,
  "BBB", "LIFE",           2020, 80,
  "CCC", "LIFE",           2020, 60,
  "AAA", "SHARE.GDP",      2020, 50,
  "BBB", "SHARE.GDP",      2020, 10,
  "AAA", "TONS",           2020, 5,
  "BBB", "TONS",           2020, 5,
  "AAA", "GINI",           2020, 40,
  "BBB", "GINI",           2020, 30,
  "CCC", "GINI",           2020, 50,
)
members <- tibble::tibble(group = "BLOC-TEST", iso3 = c("AAA", "BBB", "CCC"))
methods <- tibble::tribble(
  ~code,            ~aggregation,
  "SP.POP.TOTL",    "sum",
  "NY.GDP.MKTP.CD", "sum",
  "LIFE",           "pop",
  "SHARE.GDP",      "gdp",
  "TONS",           "sum",
  "GINI",           "none",
)
result <- aggregate_groups(data, members, methods)
value_of <- function(code) result$value[result$code == code]

test_that("sums add up the members", {
  expect_equal(value_of("SP.POP.TOTL"), 1000)
  expect_equal(value_of("NY.GDP.MKTP.CD"), 100)
})

test_that("sums are dropped when a member has no data", {
  expect_length(value_of("TONS"), 0)   # CCC has no TONS value
})

test_that("population-weighted averages use population as weight", {
  # (70*100 + 80*300 + 60*600) / 1000 = 67
  expect_equal(value_of("LIFE"), 67)
})

test_that("GDP-weighted averages need 2/3 of the GDP covered", {
  # A and B have data but only 40 of 100 GDP: below 2/3, so no value
  expect_length(value_of("SHARE.GDP"), 0)
  # With a lower threshold it is calculated: (50*10 + 10*30) / 40 = 20
  loose <- aggregate_groups(data, members, methods, min_coverage = 0.3)
  expect_equal(loose$value[loose$code == "SHARE.GDP"], 20)
  expect_equal(loose$coverage[loose$code == "SHARE.GDP"], 0.4)
})

test_that("'none' indicators are never aggregated", {
  expect_length(value_of("GINI"), 0)
})

test_that("unknown methods stop the pipeline", {
  expect_error(aggregate_groups(data, members, tibble::tibble(code = "LIFE", aggregation = "mean")), "Unknown")
})

test_that("group codes are readable and the EU is left to the World Bank", {
  expect_equal(group_code("African Union", "BLOC"), "BLOC-AFRICAN-UNION")
  blocs <- tibble::tibble(iso3 = c("BRA", "DEU"), bloc = c("BRICS", "European Union"))
  countries <- tibble::tibble(iso3 = c("BRA", "DEU"), continent = c("Americas", "Europe"))
  groups <- unique(group_members(blocs, countries)$group)
  expect_setequal(groups, c("BLOC-BRICS", "CONT-AMERICAS", "CONT-EUROPE"))
})

test_that("World Bank aggregates are marked official, and EUU stands for the EU", {
  wb <- tibble::tibble(iso3 = c("WLD", "EUU"), name_en = c("World", "European Union"))
  out <- describe_official(wb)
  expect_equal(out$kind, c("official", "official"))
  expect_equal(out$bloc, c(NA, "European Union"))
})
