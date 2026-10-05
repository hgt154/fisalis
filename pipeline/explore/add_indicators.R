# Adds 15 World Bank (WDI) indicators to the site's catalog:
#   interest rates, refugees and conflict displacement, homicides by sex,
#   intimate-partner violence against women, and 8 education indicators.
#
# It only APPENDS rows to config/indicators.csv, config/indicator_groups.csv and
# config/aggregation.csv (how blocs and continents combine each one), and skips any indicator that is already there, so running it twice is harmless.
#
# Run from the pipeline folder:   Rscript explore/add_indicators.R

stopifnot(file.exists("config/indicators.csv"), file.exists("config/indicator_groups.csv"))

# The Portuguese names have accents: R must be running in UTF-8 (the default on a Mac)
if (!isTRUE(l10n_info()[["UTF-8"]])) stop("R is not running in UTF-8; run: LANG=en_US.UTF-8 Rscript explore/add_indicators.R")

# ---------------------------------------------------------------------------
# The new indicators
# columns: code, name_pt, name_en, unit, format, higher_is_better, source_note

new_indicators <- data.frame(rbind(
  # Interest rates
  c("FR.INR.RINR", "Taxa de juros real (%)", "Real interest rate (%)",
    "%", "percent", "", "Lending rate adjusted for inflation (GDP deflator); can be negative"),
  c("FR.INR.LEND", "Taxa de juros de empréstimos (%)", "Lending interest rate (%)",
    "%", "percent", "", "Rate banks charge on short- and medium-term loans; definitions vary by country"),

  # Public safety
  c("VC.IHR.PSRC.FE.P5", "Homicídios intencionais, mulheres (por 100 mil mulheres)",
    "Intentional homicides, female (per 100,000 female)", "per 100k", "number", "FALSE", ""),
  c("VC.IHR.PSRC.MA.P5", "Homicídios intencionais, homens (por 100 mil homens)",
    "Intentional homicides, male (per 100,000 male)", "per 100k", "number", "FALSE", ""),
  c("SM.POP.RHCR.EO", "Refugiados por país de origem (mandato do ACNUR)",
    "Refugees under the mandate of the UNHCR by country or territory of origin", "people", "compact", "FALSE", ""),
  c("VC.IDP.NWCV", "Deslocados internos, novos deslocamentos por conflito e violência (número de casos)",
    "Internally displaced persons, new displacement associated with conflict and violence (number of cases)",
    "cases", "compact", "FALSE", ""),
  c("SG.VAW.1549.ZS",
    "Mulheres que sofreram violência física e/ou sexual do parceiro nos últimos 12 meses (% das que já tiveram parceiro, 15 a 49 anos)",
    "Proportion of women subjected to physical and/or sexual violence in the last 12 months (% of ever-partnered women ages 15-49)",
    "%", "percent", "FALSE", "Survey-based; only a few years per country"),

  # Education
  c("SE.XPD.TOTL.GD.ZS", "Gasto público em educação (% do PIB)",
    "Government expenditure on education, total (% of GDP)", "%", "percent", "", ""),
  c("SE.PRM.CMPT.ZS", "Taxa de conclusão do ensino fundamental I, total (%)",
    "Primary completion rate, total (% of relevant age group)", "%", "percent", "TRUE", "Gross ratio; can exceed 100%"),
  c("SE.SEC.ENRR", "Matrícula escolar, ensino fundamental II e médio (% bruto)",
    "School enrollment, secondary (% gross)", "%", "percent", "", "Gross ratio; can exceed 100%"),
  c("SE.TER.ENRR", "Matrícula escolar, ensino superior (% bruto)",
    "School enrollment, tertiary (% gross)", "%", "percent", "", "Gross ratio; can exceed 100%"),
  c("SE.PRM.UNER.ZS", "Crianças fora da escola (% da idade do ensino fundamental I)",
    "Children out of school (% of primary school age)", "%", "percent", "FALSE", ""),
  c("SE.LPV.PRIM",
    "Pobreza de aprendizagem: crianças que não leem com proficiência mínima ao fim do ensino fundamental I (%)",
    "Learning poverty: Share of Children at the End-of-Primary age below minimum reading proficiency adjusted by Out-of-School Children (%)",
    "%", "percent", "FALSE", "Counts children out of school as not reading; only a few years per country"),
  c("SE.PRM.ENRL.TC.ZS", "Alunos por professor, ensino fundamental I",
    "Pupil-teacher ratio, primary", "ratio", "number", "FALSE", ""),
  c("SE.TER.CUAT.BA.ZS", "Adultos com pelo menos graduação (% da população com 25 anos ou mais)",
    "Educational attainment, at least Bachelor's or equivalent, population 25+, total (%) (cumulative)",
    "%", "percent", "TRUE", "")
), stringsAsFactors = FALSE)
names(new_indicators) <- c("code", "name_pt", "name_en", "unit", "format", "higher_is_better", "source_note")

# ---------------------------------------------------------------------------
# Where each one appears on the Indicators page (tab, group, position in the group)

FCV <- "Fragility, Conflict and Violence"
FIN <- "Finance, Competitiveness & Innovation"
SDG4 <- "SDG 4 - Quality Education"
SDG5 <- "SDG 5 - Gender Equality"
SDG16 <- "SDG 16 - Peace, Justice and Strong Institutions"

new_groups <- data.frame(rbind(
  c("FR.INR.RINR", "overview", "Economic", 6),   # next to inflation in the Overview
  c("FR.INR.RINR", "theme", FIN, 5),
  c("FR.INR.LEND", "theme", FIN, 6),

  c("VC.IHR.PSRC.FE.P5", "theme", FCV, 4),
  c("VC.IHR.PSRC.MA.P5", "theme", FCV, 5),
  c("SM.POP.RHCR.EO", "theme", FCV, 6),
  c("VC.IDP.NWCV", "theme", FCV, 7),
  c("VC.IHR.PSRC.FE.P5", "sdg", SDG16, 6),
  c("VC.IHR.PSRC.MA.P5", "sdg", SDG16, 7),
  c("SG.VAW.1549.ZS", "theme", "Gender", 5),
  c("SG.VAW.1549.ZS", "sdg", SDG5, 4),

  c("SE.XPD.TOTL.GD.ZS", "theme", "Education", 4),
  c("SE.PRM.CMPT.ZS", "theme", "Education", 5),
  c("SE.SEC.ENRR", "theme", "Education", 6),
  c("SE.TER.ENRR", "theme", "Education", 7),
  c("SE.PRM.UNER.ZS", "theme", "Education", 8),
  c("SE.LPV.PRIM", "theme", "Education", 9),
  c("SE.PRM.ENRL.TC.ZS", "theme", "Education", 10),
  c("SE.TER.CUAT.BA.ZS", "theme", "Education", 11),
  c("SE.PRM.CMPT.ZS", "sdg", SDG4, 6),
  c("SE.PRM.UNER.ZS", "sdg", SDG4, 7),
  c("SE.LPV.PRIM", "sdg", SDG4, 8)
), stringsAsFactors = FALSE)
names(new_groups) <- c("code", "view", "group", "order")

stopifnot(all(new_groups$code %in% new_indicators$code))

# ---------------------------------------------------------------------------
# How the calculated aggregates (BRICS, Mercosur, continents...) combine each one
#   sum = total of the members, pop = population-weighted average,
#   gdp = GDP-weighted average, none = not aggregated

POP <- "population-weighted average"
new_methods <- data.frame(rbind(
  c("FR.INR.RINR", "gdp", "GDP-weighted average"),
  c("FR.INR.LEND", "gdp", "GDP-weighted average"),
  c("VC.IHR.PSRC.FE.P5", "pop", POP),
  c("VC.IHR.PSRC.MA.P5", "pop", POP),
  c("SM.POP.RHCR.EO", "sum", "total of the members"),
  c("VC.IDP.NWCV", "sum", "total of the members"),
  c("SG.VAW.1549.ZS", "none", "survey years differ by country"),
  c("SE.XPD.TOTL.GD.ZS", "gdp", "GDP-weighted average"),
  c("SE.PRM.CMPT.ZS", "pop", POP),
  c("SE.SEC.ENRR", "pop", POP),
  c("SE.TER.ENRR", "pop", POP),
  c("SE.PRM.UNER.ZS", "pop", POP),
  c("SE.LPV.PRIM", "none", "survey years differ by country"),
  c("SE.PRM.ENRL.TC.ZS", "none", "needs the number of pupils as weight"),
  c("SE.TER.CUAT.BA.ZS", "pop", POP)
), stringsAsFactors = FALSE)
names(new_methods) <- c("code", "aggregation", "note")
stopifnot(setequal(new_methods$code, new_indicators$code))

# ---------------------------------------------------------------------------
# Append, keeping the files' own style (quotes only where a value has a comma or a quote)

csv_value <- function(x) {
  x[is.na(x)] <- ""
  needs <- grepl('[,"]', x)
  x[needs] <- paste0('"', gsub('"', '""', x[needs]), '"')
  x
}

append_rows <- function(path, rows, key) {
  existing <- read.csv(path, colClasses = "character", check.names = FALSE, encoding = "UTF-8")
  stopifnot(identical(names(existing), names(rows)))
  old_keys <- do.call(paste, c(existing[key], sep = "|"))
  new_keys <- do.call(paste, c(rows[key], sep = "|"))
  todo <- rows[!new_keys %in% old_keys, , drop = FALSE]
  if (nrow(todo) == 0) {
    message(path, ": nothing to add (already there)")
    return(invisible(0))
  }
  lines <- apply(as.data.frame(lapply(todo, csv_value)), 1, paste, collapse = ",")

  # Make sure the last existing line ends with a newline before appending
  raw <- readBin(path, "raw", file.info(path)$size)
  if (length(raw) > 0 && raw[length(raw)] != as.raw(10)) cat("\n", file = path, append = TRUE)

  # Write the bytes as they are (UTF-8), whatever the computer's locale is
  con <- file(path, open = "ab")
  writeLines(enc2utf8(lines), con, useBytes = TRUE)
  close(con)
  message(path, ": added ", nrow(todo), " rows")
  invisible(nrow(todo))
}

append_rows("config/indicators.csv", new_indicators, "code")
append_rows("config/indicator_groups.csv", new_groups, c("code", "view", "group"))
if (file.exists("config/aggregation.csv")) append_rows("config/aggregation.csv", new_methods, "code")

# Quick check: every row still parses and the counts add up
ind <- read.csv("config/indicators.csv", colClasses = "character", encoding = "UTF-8")
grp <- read.csv("config/indicator_groups.csv", colClasses = "character", encoding = "UTF-8")
message("Now ", nrow(ind), " indicators and ", nrow(grp), " group rows.")
stopifnot(!anyDuplicated(ind$code), all(grp$code %in% ind$code))
message("OK. Next: delete raw/wdi_long.rds and run the pipeline.")
