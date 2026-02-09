use noise::{NoiseFn, Perlin, Simplex};

use crate::NoiseType;

pub struct LayeredNoise {
    simplex: Simplex,
    perlin: Perlin,
    noise_type: NoiseType,
    octaves: u32,
    persistence: f64,
    lacunarity: f64,
    scale: f64,
}

impl LayeredNoise {
    pub fn new(
        seed: u64,
        noise_type: NoiseType,
        octaves: u32,
        persistence: f64,
        lacunarity: f64,
        scale: f64,
    ) -> Self {
        let seed_u32 = (seed & 0xFFFFFFFF) as u32;
        Self {
            simplex: Simplex::new(seed_u32),
            perlin: Perlin::new(seed_u32),
            noise_type,
            octaves: octaves.max(1),
            persistence,
            lacunarity,
            scale,
        }
    }

    fn base_sample(&self, x: f64, y: f64) -> f64 {
        match self.noise_type {
            NoiseType::Simplex | NoiseType::Ridged | NoiseType::Warped => {
                self.simplex.get([x, y])
            }
            NoiseType::Perlin => self.perlin.get([x, y]),
        }
    }

    pub fn sample(&self, world_x: f64, world_z: f64) -> f64 {
        let mut amplitude = 1.0;
        let mut frequency = 1.0;
        let mut value = 0.0;
        let mut max_amplitude = 0.0;

        let sx = world_x * self.scale * 0.005;
        let sz = world_z * self.scale * 0.005;

        for _ in 0..self.octaves {
            let sample = self.base_sample(sx * frequency, sz * frequency);
            value += sample * amplitude;
            max_amplitude += amplitude;
            amplitude *= self.persistence;
            frequency *= self.lacunarity;
        }

        // Normalize to [0, 1]
        let normalized = (value / max_amplitude + 1.0) * 0.5;
        normalized.clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_output() {
        let noise = LayeredNoise::new(42, NoiseType::Simplex, 6, 0.5, 2.0, 1.0);
        let a = noise.sample(100.0, 200.0);
        let b = noise.sample(100.0, 200.0);
        assert!((a - b).abs() < f64::EPSILON, "Noise must be deterministic");
    }

    #[test]
    fn output_in_range() {
        let noise = LayeredNoise::new(42, NoiseType::Simplex, 6, 0.5, 2.0, 1.0);
        for x in 0..100 {
            for z in 0..100 {
                let v = noise.sample(x as f64, z as f64);
                assert!(
                    (0.0..=1.0).contains(&v),
                    "Value {} out of range at ({}, {})",
                    v,
                    x,
                    z
                );
            }
        }
    }

    #[test]
    fn different_seeds_differ() {
        let a = LayeredNoise::new(1, NoiseType::Simplex, 6, 0.5, 2.0, 1.0);
        let b = LayeredNoise::new(2, NoiseType::Simplex, 6, 0.5, 2.0, 1.0);
        let va = a.sample(50.0, 50.0);
        let vb = b.sample(50.0, 50.0);
        assert!(
            (va - vb).abs() > 0.001,
            "Different seeds should produce different values"
        );
    }
}
