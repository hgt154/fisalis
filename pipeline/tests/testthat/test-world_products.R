# Tests for R/world_products.R — run with testthat::test_dir("tests/testthat")
source(file.path("..", "..", "R", "world_products.R"), chdir = TRUE)

# One small year: country 1 sells two products to country 2, country 2 sells one product to country 1.
# v is in thousands of US$, like the real files.
year_rows <- tibble::tribble(
  ~i, ~j, ~k,       ~v,
  1L, 2L, "120100", 30,    # soybeans (chapter 12)
  1L, 2L, "120190", 30,    # same heading 1201
  1L, 2L, "270900", 40,    # crude oil (chapter 27)
  2L, 1L, "870300", 100    # cars (chapter 87)
)

test_that("a year is reduced to chapter totals in US$ and a concentration index", {
  agg <- aggregate_baci_year(year_rows, 2024)
  exp1 <- agg$exports[agg$exports$code == 1L, ]
  expect_equal(sum(exp1$value), 100000)
  expect_equal(exp1$value[exp1$chapter == "12"], 60000)
  expect_equal(agg$imports$value[agg$imports$code == 1L], 100000)
  # Country 1: headings 1201 (60%) and 2709 (40%) -> 0.36 + 0.16; country 2: one heading -> 1
  expect_equal(agg$hhi$hhi[agg$hhi$code == 1L], 0.52)
  expect_equal(agg$hhi$hhi[agg$hhi$code == 2L], 1)
  expect_length(agg$hhi$hhi[agg$hhi$code == 0L], 1)   # the World
})

chapters <- tibble::tribble(
  ~chapter, ~group,      ~name_en,  ~name_pt,
  "12",     "agri",      "Oilseeds", "Oleaginosas",
  "27",     "minerals",  "Fuels",    "Combustíveis",
  "87",     "vehicles",  "Vehicles", "Veículos"
)
groups <- tibble::tribble(
  ~group,     ~order, ~name_en,      ~name_pt,
  "agri",     1,      "Agriculture", "Agropecuária",
  "minerals", 2,      "Minerals",    "Minerais",
  "vehicles", 3,      "Vehicles",    "Veículos",
  "other",    4,      "Other",       "Outros"
)
make_agg <- function() {
  # 2024: everything doubles, and a country outside our list (SUN) sells something with an unknown code
  rows_2024 <- dplyr::bind_rows(year_rows |> dplyr::mutate(v = v * 2), tibble::tibble(i = 3L, j = 1L, k = "999999", v = 5))
  years <- list(aggregate_baci_year(year_rows, 2023), aggregate_baci_year(rows_2024, 2024))
  list(
    version = "202601",
    exports = purrr::map(years, "exports") |> purrr::list_rbind(),
    imports = purrr::map(years, "imports") |> purrr::list_rbind(),
    hhi     = purrr::map(years, "hhi") |> purrr::list_rbind(),
    codes   = tibble::tibble(code = c(1L, 2L, 3L), iso3 = c("AAA", "BBB", "SUN"))
  )
}

test_that("the latest year comes with the year before, and the World adds everyone up", {
  wp <- build_world_products(make_agg(), chapters, groups, valid_iso3 = c("AAA", "BBB"), min_economies = 2)
  expect_equal(wp$year, 2024L)
  aaa_soy <- wp$latest[wp$latest$iso3 == "AAA" & wp$latest$chapter == "12", ]
  expect_equal(aaa_soy$value, 120000)
  expect_equal(aaa_soy$prev, 60000)
  wld_exports <- sum(wp$latest$value[wp$latest$iso3 == "WLD" & wp$latest$flow == "export"])
  expect_equal(wld_exports, 405000)                   # 200k + 200k + 5k from the unlisted country
  expect_setequal(wp$economies$iso3, c("AAA", "BBB", "WLD"))
})

test_that("history has one column per group, and unknown chapters count as other", {
  wp <- build_world_products(make_agg(), chapters, groups, valid_iso3 = c("AAA", "BBB"), min_economies = 2)
  aaa <- wp$history[wp$history$iso3 == "AAA" & wp$history$flow == "export" & wp$history$year == 2024, ]
  expect_equal(aaa$agri, 120000)
  expect_equal(aaa$minerals, 80000)
  wld_imp <- wp$history[wp$history$iso3 == "WLD" & wp$history$flow == "import" & wp$history$year == 2024, ]
  expect_equal(wld_imp$other, 5000)                   # chapter 99 is not in the list
})

test_that("a suspiciously small result stops before writing", {
  expect_error(build_world_products(make_agg(), chapters, groups, valid_iso3 = c("AAA", "BBB")), "only 3 economies")
})

test_that("the World has one concentration value per year", {
  wp <- build_world_products(make_agg(), chapters, groups, valid_iso3 = c("AAA", "BBB"), min_economies = 2)
  expect_equal(sum(wp$concentration$iso3 == "WLD"), 2)
})
