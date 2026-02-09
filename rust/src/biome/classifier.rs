use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Biome {
    DeepOcean = 0,
    ShallowWater = 1,
    Beach = 2,
    Desert = 3,
    Grassland = 4,
    Forest = 5,
    DenseForest = 6,
    Jungle = 7,
    Tundra = 8,
    Snow = 9,
    Mountain = 10,
    Volcanic = 11,
}

pub fn classify_biome(elevation: f32, moisture: f32, sea_level: f32) -> Biome {
    if elevation < sea_level - 0.1 {
        return Biome::DeepOcean;
    }
    if elevation < sea_level {
        return Biome::ShallowWater;
    }
    if elevation < sea_level + 0.02 {
        return Biome::Beach;
    }

    let range = 1.0 - sea_level;
    if range <= 0.0 {
        return Biome::Grassland;
    }
    let land_elevation = ((elevation - sea_level) / range).clamp(0.0, 1.0);

    if land_elevation > 0.85 {
        return Biome::Snow;
    }
    if land_elevation > 0.65 {
        return Biome::Mountain;
    }
    if land_elevation > 0.5 && moisture < 0.3 {
        return Biome::Tundra;
    }

    if moisture < 0.2 {
        Biome::Desert
    } else if land_elevation < 0.25 && moisture > 0.7 {
        Biome::Jungle
    } else if moisture > 0.65 {
        Biome::DenseForest
    } else if moisture > 0.4 {
        Biome::Forest
    } else {
        Biome::Grassland
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deep_ocean_classification() {
        assert_eq!(classify_biome(0.1, 0.5, 0.35), Biome::DeepOcean);
    }

    #[test]
    fn shallow_water_classification() {
        assert_eq!(classify_biome(0.30, 0.5, 0.35), Biome::ShallowWater);
    }

    #[test]
    fn beach_classification() {
        assert_eq!(classify_biome(0.36, 0.5, 0.35), Biome::Beach);
    }

    #[test]
    fn snow_at_high_elevation() {
        assert_eq!(classify_biome(0.95, 0.5, 0.35), Biome::Snow);
    }

    #[test]
    fn desert_low_moisture() {
        assert_eq!(classify_biome(0.5, 0.1, 0.35), Biome::Desert);
    }

    #[test]
    fn forest_medium_moisture() {
        assert_eq!(classify_biome(0.5, 0.5, 0.35), Biome::Forest);
    }

    #[test]
    fn all_extremes_classified() {
        // Verify no panics or missing arms across full range
        for e in 0..=100 {
            for m in 0..=100 {
                let _ = classify_biome(e as f32 / 100.0, m as f32 / 100.0, 0.35);
            }
        }
    }
}
