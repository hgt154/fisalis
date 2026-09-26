# Validates the indicator catalog in config/.
# Run from the pipeline project root:  source("R/validate_catalog.R")

library(readr)
library(dplyr)

ind    <- read_csv("config/indicators.csv", show_col_types = FALSE)
groups <- read_csv("config/indicator_groups.csv", show_col_types = FALSE)

# 1. Every indicator code appears only once in the catalog
dups <- ind |> count(code) |> filter(n > 1)
stopifnot("Duplicate codes in indicators.csv" = nrow(dups) == 0)

# 2. Every group row points to a code that exists in the catalog
orphans <- anti_join(groups, ind, by = "code")
stopifnot("Codes in indicator_groups.csv missing from indicators.csv" = nrow(orphans) == 0)

# 3. Every catalog indicator is used in at least one group
unused <- anti_join(ind, groups, by = "code")
if (nrow(unused) > 0) warning("Indicators not used in any group: ", paste(unused$code, collapse = ", "))

# 4. Only allowed values in the controlled columns
stopifnot(all(groups$view %in% c("overview", "theme", "sdg")))
stopifnot(all(ind$format %in% c("number", "percent", "currency", "compact")))

message("Catalog OK: ", nrow(ind), " indicators, ", nrow(groups), " group rows")
groups |> count(view, group) |> print(n = Inf)
