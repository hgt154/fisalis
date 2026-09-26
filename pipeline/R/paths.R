library(WDI)

# checking the data 
br <- WDI(country = "BR", indicator = c("SP.POP.TOTL", "NY.GDP.MKTP.CD"), start = 2015)
br
names(br)

meta <- WDIcache()          # downloads the latest catalogs (takes ~30 s)
View(meta$country)
table(meta$country$region)


# saving paths in one place - Later scripts load these files first and then use the variables instead of typing folder names:
PATH_CONFIG <- "config" # The config files are in the config folder.
PATH_RAW    <- "raw" # Cached downloads will go in a raw folder. It doesn't exist yet; the pipeline will create it.
PATH_OUT    <- file.path("..", "web", "public", "data") # The JSON for the website goes here. .. means "go up one folder": from pipeline/ up to fisalis/, then into web/public/data. file.path() joins the parts with /.

START_YEAR  <- 2000 # Data is downloaded from this year onward.

# If I later rename a folder, or decide to start at 1990 instead of 2000, I change one line in paths.R and every script picks it up. Without this file i'd have to search every script for "config" or 2000.



