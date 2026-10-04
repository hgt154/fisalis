# Tests for R/world_trade.R — run with testthat::test_dir("tests/testthat")
source(file.path("..", "..", "R", "world_trade.R"), chdir = TRUE)

# What the API sends back (as text columns), including one of its empty "header" rows
raw_rows <- tibble::tribble(
  ~COUNTRY, ~INDICATOR,   ~COUNTERPART_COUNTRY, ~TIME_PERIOD, ~OBS_VALUE,
  NA,       NA,           NA,                   NA,           NA,
  "AAA",    "XG_FOB_USD", "G001",               "2025-M01",   "100",
  "AAA",    "MG_CIF_USD", "G001",               "2025-M01",   "80",
  "AAA",    "TBG_USD",    "G001",               "2025-M01",   "20",   # an indicator we don't use
  "AAA",    "XG_FOB_USD", "G001",               "2025-M02",   NA      # missing value
)

test_that("parse_imts keeps exports and imports and drops empty rows", {
  p <- parse_imts(raw_rows)
  expect_equal(nrow(p), 2)
  expect_setequal(p$flow, c("export", "import"))
  expect_equal(p$value, c(100, 80))
})

# A tiny but complete download: reporters AAA, BBB, the World (G001) and a dissolved country (SUN)
make_raw <- function() {
  totals <- \(period) tibble::tribble(
    ~reporter, ~partner, ~flow,    ~period, ~value,
    "AAA",     "G001",   "export", period,  100,
    "AAA",     "G001",   "import", period,  80,
    "BBB",     "G001",   "export", period,  50,
    "G001",    "G001",   "export", period,  1000,
    "G001",    "G001",   "import", period,  990,
    "SUN",     "G001",   "export", period,  5
  )
  list(
    monthly  = totals("2025-M01"),
    annual   = totals("2025"),
    partners = tibble::tribble(
      ~reporter, ~partner, ~flow,    ~period, ~value,
      "AAA",     "BBB",    "export", "2025",  60,
      "AAA",     "TWN",    "export", "2025",  40,
      "AAA",     "G110",   "export", "2025",  70,   # a group, not a country
      "AAA",     "GX170",  "export", "2025",  10,   # a group
      "AAA",     "CCC",    "export", "2025",  0,    # zero trade
      "G001",    "AAA",    "import", "2025",  80
    )
  )
}
fake_names <- \(iso3) tibble::tibble(iso3 = iso3, name_en = paste("Name", iso3), name_pt = paste("Nome", iso3))

test_that("build_world_trade publishes the World as WLD and drops unknown reporters", {
  wt <- build_world_trade(make_raw(), valid_iso3 = c("AAA", "BBB", "CCC"), min_reporters = 2, name_lookup = fake_names)
  expect_setequal(wt$index$iso3, c("AAA", "BBB", "WLD"))
  expect_equal(wt$annual$export[wt$annual$reporter == "WLD"], 1000)
  expect_equal(wt$monthly$date[1], "2025-01")
})

test_that("partners keep real countries only, and name the ones outside our list", {
  wt <- build_world_trade(make_raw(), valid_iso3 = c("AAA", "BBB", "CCC"), min_reporters = 2, name_lookup = fake_names)
  aaa <- wt$partners[wt$partners$reporter == "AAA", ]
  expect_setequal(aaa$iso3, c("BBB", "TWN"))
  expect_equal(wt$partner_names$iso3, "TWN")
  expect_equal(wt$index$partners[wt$index$iso3 == "BBB"], FALSE)
  expect_equal(wt$index$partners[wt$index$iso3 == "WLD"], TRUE)
})

test_that("a reporter with only exports still gets an import column", {
  wt <- build_world_trade(make_raw(), valid_iso3 = c("AAA", "BBB"), min_reporters = 2, name_lookup = fake_names)
  expect_equal(is.na(wt$annual$import[wt$annual$reporter == "BBB"]), TRUE)
})

test_that("a suspiciously small download stops before writing", {
  expect_error(build_world_trade(make_raw(), valid_iso3 = c("AAA", "BBB"), name_lookup = fake_names), "only 3 reporters")
})
