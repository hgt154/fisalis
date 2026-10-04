# Tests for R/conflicts.R — run with testthat::test_dir("tests/testthat")
source(file.path("..", "..", "R", "conflicts.R"), chdir = TRUE)

# Stand-in for countrycode, so the tests know exactly which codes exist
gw_lookup <- function(gw) unname(c("2" = "USA", "365" = "RUS", "369" = "UKR", "625" = "SDN", "666" = "ISR")[as.character(gw)])

test_that("country codes: lists, historical states and unknown codes", {
  expect_equal(gw_to_iso3("365, 369"), c("RUS", "UKR"))
  expect_equal(gw_to_iso3("678"), "YEM")            # Yemen (North Yemen)
  expect_equal(gw_to_iso3(c("345", NA, "999")), "SRB")
  expect_equal(gw_to_iso3(NA), character())
})

test_that("candidate files: the Jan-Jun file plus later months, newest year only", {
  files <- c("GEDEvent_v25_0_12.csv", "GEDEvent_v26_0_8.csv", "GEDEvent_v26_01_26_06.csv",
             "GEDEvent_v26_0_7.csv", "GEDEvent_v26_0_5.csv", "GEDEvent_v26_01_26_03.csv")
  expect_equal(pick_candidate_files(files), c("GEDEvent_v26_01_26_06.csv", "GEDEvent_v26_0_7.csv", "GEDEvent_v26_0_8.csv"))
  expect_equal(pick_candidate_files(c("GEDEvent_v27_0_2.csv", "GEDEvent_v27_0_1.csv")),
               c("GEDEvent_v27_0_1.csv", "GEDEvent_v27_0_2.csv"))
})

# Two conflicts: Russia-Ukraine (interstate, 2022-2024, a war in 2023-2024) and Sudan (intrastate,
# 1990 and 2024, with the USA as a supporter in 2024)
acd <- tibble::tribble(
  ~conflict_id, ~location,         ~side_a,                ~side_a_2nd, ~side_b,                 ~side_b_2nd, ~incompatibility, ~territory_name, ~year, ~intensity_level, ~type_of_conflict, ~start_date,  ~gwno_a, ~gwno_a_2nd, ~gwno_b, ~gwno_b_2nd, ~gwno_loc,
  1,            "Russia, Ukraine", "Government of Russia", NA,          "Government of Ukraine", NA,          1,                "Donbas",        2022,  1,                2,                 "2014-02-27", "365",   NA,          "369",   NA,          "365, 369",
  1,            "Russia, Ukraine", "Government of Russia", NA,          "Government of Ukraine", NA,          1,                "Donbas",        2023,  2,                2,                 "2014-02-27", "365",   NA,          "369",   NA,          "365, 369",
  1,            "Russia, Ukraine", "Government of Russia", NA,          "Government of Ukraine", NA,          1,                "Donbas",        2024,  2,                2,                 "2014-02-27", "365",   NA,          "369",   NA,          "365, 369",
  2,            "Sudan",           "Government of Sudan",  NA,          "SPLM/A",                NA,          2,                NA,              1990,  1,                3,                 "1983-06-05", "625",   NA,          NA,      NA,          "625",
  2,            "Sudan",           "Government of Sudan",  "Government of United States", "RSF", NA,          2,                NA,              2024,  1,                4,                 "1983-06-05", "625",   "2",         NA,      NA,          "625"
)
brd <- tibble::tribble(
  ~conflict_id, ~year, ~bd_best, ~bd_low, ~bd_high,
  1,            2022,  500,      400,     600,
  1,            2023,  50000,    40000,   80000,
  1,            2024,  60000,    55000,   90000,
  2,            1990,  300,      200,     400,
  2,            2024,  800,      700,     900
)
cy <- tibble::tribble(
  ~country_id, ~year, ~sb_total_deaths_best, ~sb_total_deaths_low, ~sb_total_deaths_high, ~ns_total_deaths_best, ~os_total_deaths_best,
  369,         2024,  59000,                 54000,                89000,                 0,                     100,
  365,         2024,  1000,                  1000,                 1000,                  0,                     0,
  625,         2024,  800,                   700,                  900,                   300,                   500,
  625,         1990,  300,                   200,                  400,                   0,                     0
)
candidate <- tibble::tribble(
  ~id, ~release,                     ~date_start,  ~date_end,    ~type_of_violence, ~country_id, ~best, ~conflict_new_id, ~conflict_name,
  10,  "GEDEvent_v26_01_26_06.csv",  "2026-01-05", "2026-01-05", 1,                 369,         10,    1,                "Russia - Ukraine",
  10,  "GEDEvent_v26_0_7.csv",       "2026-01-05", "2026-01-05", 1,                 369,         12,    1,                "Russia - Ukraine",   # corrected later
  11,  "GEDEvent_v26_0_7.csv",       "2026-07-02", "2026-07-02", 3,                 625,         5,     9,                "RSF - civilians"
)
raw <- list(version = "261", acd = acd, brd = brd, cy = cy, candidate = candidate,
            candidate_files = c("GEDEvent_v26_01_26_06.csv", "GEDEvent_v26_0_7.csv"))
valid <- c("RUS", "UKR", "SDN", "USA")

test_that("each conflict gets its timeline, deaths, type and every country involved", {
  cf <- build_conflicts(raw, valid, min_conflicts = 1)
  ru <- cf$conflicts[cf$conflicts$conflict_id == 1, ]
  expect_equal(ru$years[[1]], c(2022, 2023, 2024))
  expect_equal(ru$intensity[[1]], c(1, 2, 2))
  expect_equal(ru$deaths_total, 110500)
  expect_equal(ru$type, "interstate")
  expect_equal(ru$incompat, "territory")
  expect_true(ru$active)
  sd <- cf$conflicts[cf$conflicts$conflict_id == 2, ]
  expect_equal(sd$type, "internationalized")           # its latest year
  expect_equal(sd$side_b, "RSF")
  roles <- sd$countries[[1]]
  expect_equal(roles$role[roles$iso3 == "SDN"], "location")
  expect_equal(roles$role[roles$iso3 == "USA"], "supporter")
})

test_that("the world view counts conflicts by type every year, with gaps filled", {
  cf <- build_conflicts(raw, valid, min_conflicts = 1)
  y2024 <- cf$by_type[cf$by_type$year == 2024, ]
  expect_equal(y2024$interstate, 1)
  expect_equal(y2024$internationalized, 1)
  expect_equal(y2024$wars, 1)
  expect_equal(nrow(cf$by_type), 2024 - 1990 + 1)       # every year, even quiet ones
  expect_equal(cf$deaths_world$sb[cf$deaths_world$year == 2024], 60800)
})

test_that("the map lists countries with deaths or an active conflict in the latest year", {
  cf <- build_conflicts(raw, valid, min_conflicts = 1)
  sdn <- cf$map[cf$map$iso3 == "SDN", ]
  expect_equal(sdn$conflicts, 1)
  expect_equal(sdn$os, 500)
  expect_equal(cf$map$max_intensity[cf$map$iso3 == "UKR"], 2)
})

test_that("preliminary events keep the newest version of each event", {
  cf <- build_conflicts(raw, valid, min_conflicts = 1)
  expect_equal(cf$candidate$months$sb[cf$candidate$months$month == "2026-01"], 12)
  expect_equal(cf$candidate$countries$total[cf$candidate$countries$iso3 == "SDN"], 5)
  expect_equal(cf$candidate$to, "2026-07-02")
})

test_that("a suspiciously small download stops before writing", {
  expect_error(build_conflicts(raw, valid), "only 2 conflicts")
})

test_that("every country involved gets a file, supporters included", {
  PATH_OUT <<- tempfile()
  write_conflicts(build_conflicts(raw, valid, min_conflicts = 1))
  files <- list.files(file.path(PATH_OUT, "conflicts", "countries"))
  expect_setequal(files, c("RUS.json", "UKR.json", "SDN.json", "USA.json"))
})
