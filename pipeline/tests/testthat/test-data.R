data_file <- function(file) {
  jsonlite::read_json(file.path("..", "..", "..", "web", "public", "data", file), simplifyVector = TRUE)
}

test_that("no duplicate country-indicator rows in latest.json", {
  latest <- data_file("latest.json")
  dups <- latest |> dplyr::count(iso3, code) |> dplyr::filter(n > 1)
  expect_equal(nrow(dups), 0)
})

test_that("every catalog indicator returned some data", {
  latest  <- data_file("latest.json")
  ind     <- readr::read_csv(file.path("..", "..", "config", "indicators.csv"), show_col_types = FALSE)
  missing <- setdiff(ind$code, unique(latest$code))
  expect_equal(missing, character(0), info = paste(missing, collapse = ", "))
})

test_that("every country has region and continent", {
  countries <- data_file("countries.json")
  expect_false(any(is.na(countries$region)))
  expect_false(any(is.na(countries$continent)))
})