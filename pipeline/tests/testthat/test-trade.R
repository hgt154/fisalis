trade <- function(file) jsonlite::read_json(file.path("..", "..", "..", "web", "public", "data", "trade", file),
                                            simplifyVector = TRUE)

test_that("shares add up to 100% in each period and flow", {
  totals <- trade("partners.json") |> dplyr::summarise(s = sum(share), .by = c(period, flow))
  expect_true(all(abs(totals$s - 1) < 1e-9))
})

test_that("partner totals match the summary cards", {
  cards    <- trade("summary.json") |> dplyr::filter(flow %in% c("export", "import"))
  partners <- trade("partners.json") |> dplyr::summarise(total = sum(value), .by = c(period, flow))
  both     <- dplyr::inner_join(cards, partners, by = c("period", "flow"))
  expect_true(all(abs(both$value / both$total - 1) < 0.001))   # within 0.1%
})

test_that("there are three periods", {
  expect_setequal(unique(trade("summary.json")$period), c("month", "ytd", "year"))
})