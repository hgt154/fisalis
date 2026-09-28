library(dplyr)
library(sf)


# Country shapes keyed by World Bank ISO3 codes
build_world_shapes <- function() {
  sf_use_s2(FALSE)   # simpler geometry engine; avoids errors when merging shapes
  
  fixes <- readr::read_csv(file.path(PATH_CONFIG, "geo_fixes.csv"), show_col_types = FALSE)
  
  rnaturalearth::ne_countries(scale = 50, returnclass = "sf") |>
    transmute(ne_code = if_else(iso_a3_eh == "-99", adm0_a3, iso_a3_eh)) |> # Uses the backup code when the main one is "-99"
    left_join(fixes |> select(ne_code, iso3), by = "ne_code") |> # If a code appears in your fixes table, use the corrected one; otherwise keep the original. coalesce means "take the first value that isn't NA".
    mutate(iso3 = coalesce(iso3, ne_code)) |>
    group_by(iso3) |> # On an sf table, summarising merges the shapes. That's how Jersey and Guernsey become one "Channel Islands" shape, and Somalia absorbs Somaliland.
    summarise(.groups = "drop")          # merges pieces that share a code (JEY+GGY -> CHI)
}

# Which World Bank countries have no shape?
check_shapes <- function(countries, shapes) {
  countries |> filter(!iso3 %in% shapes$iso3) |> select(iso3, name_en)
}

# Save GeoJSON, then simplify + convert to TopoJSON with mapshaper
export_world <- function(shapes) {
  dir.create(PATH_RAW, showWarnings = FALSE)
  geo  <- file.path(PATH_RAW, "world.geojson")
  topo <- file.path(PATH_OUT, "world.topo.json")
  
  st_write(shapes, geo, delete_dsn = TRUE, quiet = TRUE)
  
  status <- system2("npx", c("-y", "mapshaper", shQuote(geo), # Runs a terminal command from inside R, so the whole pipeline stays one script.
                             "-simplify", "15%", "keep-shapes", # Keeps 15% of the border points, which is plenty at world scale. keep-shapes stops tiny islands from disappearing.
                             "-rename-layers", "countries",
                             "-o", "format=topojson", "quantization=1e5", shQuote(topo))) # Rounds coordinates to a fine grid, which shrinks the file a lot with no visible difference.
  if (status != 0) stop("mapshaper failed")
  
  message("Wrote ", topo, " (", round(file.size(topo) / 1024), " KB)")
}





# Brazilian states keyed by their two-letter code (SP, MG ...)
build_brazil_states <- function() {
  geobr::read_state(year = 2020, showProgress = FALSE) |>
    transmute(uf = abbrev_state)
}

export_brazil <- function(shapes) {
  dir.create(PATH_RAW, showWarnings = FALSE)
  geo  <- file.path(PATH_RAW, "brazil.geojson")
  topo <- file.path(PATH_OUT, "brazil.topo.json")
  
  st_write(shapes, geo, delete_dsn = TRUE, quiet = TRUE)
  
  status <- system2("npx", c("-y", "mapshaper", shQuote(geo),
                             "-simplify", "10%", "keep-shapes",
                             "-rename-layers", "states",
                             "-o", "format=topojson", "quantization=1e5", shQuote(topo)))
  if (status != 0) stop("mapshaper failed")
  message("Wrote ", topo, " (", round(file.size(topo) / 1024), " KB)")
}