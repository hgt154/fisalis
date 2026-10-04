# Probe the BACI HS92 file (CEPII) before building the products step.
# Run from the pipeline/ folder:   Rscript explore/baci_probe.R
# Needs the zip in raw/baci/ first (see the curl command in the message). Nothing goes to the site.

library(readr)
library(dplyr)

ZIP <- list.files("raw/baci", pattern = "^BACI_HS92_V\\d+\\.zip$", full.names = TRUE)[1]
if (is.na(ZIP)) stop("No BACI_HS92_V*.zip in raw/baci/. Download it first.")
cat("Zip:", ZIP, "|", round(file.size(ZIP) / 1e9, 2), "GB\n")

# --- 1. What is inside (without extracting the 8 GB) ---------------------------------
contents <- unzip(ZIP, list = TRUE)
cat("\nFiles in the zip:", nrow(contents), "\n")
print(contents |> mutate(MB = round(Length / 1e6)) |> select(Name, MB) |> head(5))
cat("...\n")
print(contents |> mutate(MB = round(Length / 1e6)) |> select(Name, MB) |> tail(4))

data_files <- sort(grep("_Y\\d{4}_", contents$Name, value = TRUE))
years <- as.integer(sub(".*_Y(\\d{4})_.*", "\\1", data_files))
cat("\nYears:", min(years), "to", max(years), "\n")

# --- 2. Extract only the small files and the latest year ------------------------------
tmp <- file.path(tempdir(), "baci")
small <- grep("country_codes|product_codes", contents$Name, value = TRUE)
latest_file <- data_files[which.max(years)]
started <- Sys.time()
unzip(ZIP, files = c(small, latest_file), exdir = tmp)
cat("Extracted", latest_file, "in", round(difftime(Sys.time(), started, units = "secs")), "s\n")

countries <- read_csv(file.path(tmp, grep("country_codes", small, value = TRUE)), show_col_types = FALSE)
products  <- read_csv(file.path(tmp, grep("product_codes", small, value = TRUE)),
                      col_types = cols(.default = col_character()))
cat("\n===== country_codes =====\n"); print(head(countries, 3), width = Inf)
cat("\n===== product_codes =====\n"); print(head(products, 3), width = Inf)
cat("Products:", nrow(products), "\n")

# --- 3. The latest year ---------------------------------------------------------------
started <- Sys.time()
flows <- read_csv(file.path(tmp, latest_file), show_col_types = FALSE,
                  col_types = cols(k = col_character(), .default = col_guess()))
cat("\n===== ", latest_file, " =====\n", sep = "")
cat("Read in", round(difftime(Sys.time(), started, units = "secs")), "s |",
    format(nrow(flows), big.mark = ","), "rows |", format(object.size(flows), units = "MB"), "in memory\n")
print(head(flows, 3), width = Inf)
cat("Exporters:", n_distinct(flows$i), "| importers:", n_distinct(flows$j), "\n")
cat("World total (v is thousands of US$):", round(sum(flows$v, na.rm = TRUE) / 1e9, 1), "trillion US$\n")

# --- 4. Brazil, to compare with the IMF and Comex --------------------------------------
iso_col  <- grep("iso.*3|iso3", names(countries), value = TRUE, ignore.case = TRUE)[1]
code_col <- grep("code", names(countries), value = TRUE, ignore.case = TRUE)[1]
bra <- countries[[code_col]][countries[[iso_col]] == "BRA"][1]
cat("\nBrazil's numeric code:", bra, "\n")
bra_x <- flows |> filter(i == bra)
cat("Brazil exports", max(years), ":", round(sum(bra_x$v) / 1e6, 1), "billion US$\n")
cat("Brazil's top 8 export chapters (HS 2 digits):\n")
bra_x |>
  mutate(chapter = substr(k, 1, 2)) |>
  group_by(chapter) |>
  summarise(bn = round(sum(v) / 1e6, 1), .groups = "drop") |>
  mutate(share = round(100 * bn / sum(bn), 1)) |>
  arrange(desc(bn)) |>
  head(8) |>
  print()

unlink(tmp, recursive = TRUE)