use wasm_bindgen::prelude::*;

use crate::biome::classifier::classify_biome;
use crate::biome::moisture::MoistureGenerator;
use crate::erosion;
use crate::noise::{LayeredNoise, RidgedNoise, WarpedNoise};
use crate::NoiseType;
use crate::TerrainConfig;

#[wasm_bindgen]
pub struct ChunkData {
    heightmap: Vec<f32>,
    moisture_map: Vec<f32>,
    biome_map: Vec<u8>,
    width: u32,
    height: u32,
    min_height: f32,
    max_height: f32,
}

#[wasm_bindgen]
impl ChunkData {
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }

    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height
    }

    #[wasm_bindgen(getter)]
    pub fn min_height(&self) -> f32 {
        self.min_height
    }

    #[wasm_bindgen(getter)]
    pub fn max_height(&self) -> f32 {
        self.max_height
    }

    pub fn get_heightmap(&self) -> Vec<f32> {
        self.heightmap.clone()
    }

    pub fn get_moisture_map(&self) -> Vec<f32> {
        self.moisture_map.clone()
    }

    pub fn get_biome_map(&self) -> Vec<u8> {
        self.biome_map.clone()
    }
}

#[wasm_bindgen]
pub fn generate_chunk(config: &TerrainConfig, chunk_x: i32, chunk_z: i32) -> ChunkData {
    let size = config.chunk_size as usize;
    let total = size * size;
    let mut heightmap = vec![0.0f32; total];

    let noise_type: NoiseType = config.noise_type().into();

    // Generate heightmap based on noise type
    match noise_type {
        NoiseType::Simplex | NoiseType::Perlin => {
            let noise = LayeredNoise::new(
                config.seed,
                noise_type,
                config.octaves,
                config.persistence,
                config.lacunarity,
                config.scale,
            );
            fill_heightmap(&noise, &mut heightmap, size, chunk_x, chunk_z, config.chunk_size);
        }
        NoiseType::Ridged => {
            let noise = RidgedNoise::new(
                config.seed,
                config.octaves,
                config.persistence,
                config.lacunarity,
                config.scale,
            );
            fill_heightmap(&noise, &mut heightmap, size, chunk_x, chunk_z, config.chunk_size);
        }
        NoiseType::Warped => {
            let noise = WarpedNoise::new(
                config.seed,
                config.warp_strength,
                config.octaves,
                config.persistence,
                config.lacunarity,
                config.scale,
            );
            fill_heightmap(&noise, &mut heightmap, size, chunk_x, chunk_z, config.chunk_size);
        }
    }

    // Apply erosion if enabled
    if config.erosion_enabled && config.erosion_iterations > 0 {
        erosion::erode(
            &mut heightmap,
            config.chunk_size,
            config.chunk_size,
            config,
        );
    }

    // Calculate min/max
    let mut min_h = f32::MAX;
    let mut max_h = f32::MIN;
    for &v in &heightmap {
        if v < min_h { min_h = v; }
        if v > max_h { max_h = v; }
    }

    // Generate moisture and biome maps
    let mut moisture_map = vec![0.0f32; total];
    let mut biome_map = vec![0u8; total];

    if config.moisture_enabled {
        let moisture_gen = MoistureGenerator::new(config.seed, config.scale);
        let edge = config.chunk_size - 1;

        for z in 0..size {
            for x in 0..size {
                let world_x = chunk_x as f64 * edge as f64 + x as f64;
                let world_z = chunk_z as f64 * edge as f64 + z as f64;
                let idx = z * size + x;

                moisture_map[idx] = moisture_gen.sample(world_x, world_z);
                biome_map[idx] = classify_biome(
                    heightmap[idx],
                    moisture_map[idx],
                    config.sea_level as f32,
                ) as u8;
            }
        }
    } else {
        // Without moisture, classify by elevation only (moisture = 0.5)
        for i in 0..total {
            biome_map[i] = classify_biome(
                heightmap[i],
                0.5,
                config.sea_level as f32,
            ) as u8;
        }
    }

    ChunkData {
        heightmap,
        moisture_map,
        biome_map,
        width: config.chunk_size,
        height: config.chunk_size,
        min_height: min_h,
        max_height: max_h,
    }
}

/// Erode an existing heightmap (called from JS for the "Erode" button)
#[wasm_bindgen]
pub fn erode_heightmap(
    heightmap: &mut [f32],
    width: u32,
    height: u32,
    config: &TerrainConfig,
) {
    erosion::erode(heightmap, width, height, config);
}

// Generic fill function that works with any noise sampler
trait NoiseSampler {
    fn sample(&self, x: f64, z: f64) -> f64;
}

impl NoiseSampler for LayeredNoise {
    fn sample(&self, x: f64, z: f64) -> f64 {
        self.sample(x, z)
    }
}

impl NoiseSampler for RidgedNoise {
    fn sample(&self, x: f64, z: f64) -> f64 {
        self.sample(x, z)
    }
}

impl NoiseSampler for WarpedNoise {
    fn sample(&self, x: f64, z: f64) -> f64 {
        self.sample(x, z)
    }
}

fn fill_heightmap(
    noise: &dyn NoiseSampler,
    heightmap: &mut [f32],
    size: usize,
    chunk_x: i32,
    chunk_z: i32,
    chunk_size: u32,
) {
    let edge = chunk_size - 1;

    for z in 0..size {
        for x in 0..size {
            let world_x = chunk_x as f64 * edge as f64 + x as f64;
            let world_z = chunk_z as f64 * edge as f64 + z as f64;
            let value = noise.sample(world_x, world_z) as f32;
            heightmap[z * size + x] = value;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_chunk_produces_correct_size() {
        let config = TerrainConfig::new(42);
        let chunk = generate_chunk(&config, 0, 0);
        let expected = config.chunk_size * config.chunk_size;
        assert_eq!(chunk.heightmap.len(), expected as usize);
        assert_eq!(chunk.biome_map.len(), expected as usize);
    }

    #[test]
    fn chunk_boundaries_are_seamless() {
        let config = TerrainConfig::new(42);
        let chunk_a = generate_chunk(&config, 0, 0);
        let chunk_b = generate_chunk(&config, 1, 0);

        let size = config.chunk_size as usize;
        // Rightmost column of chunk_a should match leftmost column of chunk_b
        for z in 0..size {
            let val_a = chunk_a.heightmap[z * size + (size - 1)];
            let val_b = chunk_b.heightmap[z * size];
            assert!(
                (val_a - val_b).abs() < 1e-6,
                "Boundary mismatch at z={}: a={}, b={}",
                z,
                val_a,
                val_b
            );
        }
    }

    #[test]
    fn negative_chunks_work() {
        let config = TerrainConfig::new(42);
        let chunk = generate_chunk(&config, -5, -3);
        assert_eq!(chunk.heightmap.len(), (config.chunk_size * config.chunk_size) as usize);
        assert!(chunk.heightmap.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn biome_map_contains_valid_values() {
        let config = TerrainConfig::new(42);
        let chunk = generate_chunk(&config, 0, 0);
        assert!(chunk.biome_map.iter().all(|&b| b <= 11));
    }
}
