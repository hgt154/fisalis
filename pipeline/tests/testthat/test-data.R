# These tests protect should protect from silent errors later 

test_that("no duplicate country-indicator-year rows", {
  data <- readRDS(file.path("..", "..", "raw", "wdi_long.rds"))
  dups <- data |> dplyr::count(iso3, code, year) |> dplyr::filter(n > 1)
  expect_equal(nrow(dups), 0)
})

test_that("every catalog indicator returned some data", {
  data <- readRDS(file.path("..", "..", "raw", "wdi_long.rds"))
  ind  <- readr::read_csv(file.path("..", "..", "config", "indicators.csv"), show_col_types = FALSE)
  missing <- setdiff(ind$code, unique(data$code))
  expect_equal(missing, character(0), info = paste(missing, collapse = ", "))
})

test_that("every country has region and continent", {
  countries <- jsonlite::read_json(file.path("..", "..", "..", "web", "public", "data", "countries.json"),
                                   simplifyVector = TRUE)
  expect_false(any(is.na(countries$region)))
  expect_false(any(is.na(countries$continent)))
})