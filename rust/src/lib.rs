use wasm_bindgen::prelude::*;

pub mod biome;
pub mod chunk;
pub mod erosion;
pub mod noise;

pub use chunk::{generate_chunk, ChunkData};

#[wasm_bindgen]
pub struct TerrainConfig {
    pub seed: u64,
    pub chunk_size: u32,
    pub scale: f64,
    pub octaves: u32,
    pub persistence: f64,
    pub lacunarity: f64,
    pub height_multiplier: f64,
    pub sea_level: f64,
    pub erosion_iterations: u32,
    pub erosion_inertia: f64,
    pub erosion_capacity: f64,
    pub erosion_deposition: f64,
    pub erosion_erosion_rate: f64,
    pub erosion_evaporation: f64,
    pub moisture_enabled: bool,
    pub erosion_enabled: bool,
    noise_type: u8, // 0=Simplex, 1=Perlin, 2=Ridged, 3=Warped
    pub warp_strength: f64,
}

#[wasm_bindgen]
impl TerrainConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> Self {
        Self {
            seed,
            chunk_size: 128,
            scale: 1.0,
            octaves: 6,
            persistence: 0.5,
            lacunarity: 2.0,
            height_multiplier: 80.0,
            sea_level: 0.35,
            erosion_iterations: 50000,
            erosion_inertia: 0.05,
            erosion_capacity: 4.0,
            erosion_deposition: 0.3,
            erosion_erosion_rate: 0.3,
            erosion_evaporation: 0.01,
            moisture_enabled: true,
            erosion_enabled: false,
            noise_type: 0,
            warp_strength: 0.5,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn noise_type(&self) -> u8 {
        self.noise_type
    }

    #[wasm_bindgen(setter)]
    pub fn set_noise_type(&mut self, val: u8) {
        self.noise_type = val.min(3);
    }
}

#[derive(Debug)]
pub enum NoiseType {
    Simplex,
    Perlin,
    Ridged,
    Warped,
}

impl From<u8> for NoiseType {
    fn from(v: u8) -> Self {
        match v {
            1 => NoiseType::Perlin,
            2 => NoiseType::Ridged,
            3 => NoiseType::Warped,
            _ => NoiseType::Simplex,
        }
    }
}
