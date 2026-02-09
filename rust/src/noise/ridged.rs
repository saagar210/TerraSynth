use noise::{NoiseFn, Simplex};

pub struct RidgedNoise {
    simplex: Simplex,
    octaves: u32,
    persistence: f64,
    lacunarity: f64,
    scale: f64,
}

impl RidgedNoise {
    pub fn new(seed: u64, octaves: u32, persistence: f64, lacunarity: f64, scale: f64) -> Self {
        let seed_u32 = (seed & 0xFFFFFFFF) as u32;
        Self {
            simplex: Simplex::new(seed_u32),
            octaves: octaves.max(1),
            persistence,
            lacunarity,
            scale,
        }
    }

    pub fn sample(&self, world_x: f64, world_z: f64) -> f64 {
        let mut amplitude = 1.0;
        let mut frequency = 1.0;
        let mut value = 0.0;
        let mut weight = 1.0;
        let mut max_amplitude = 0.0;

        let sx = world_x * self.scale * 0.005;
        let sz = world_z * self.scale * 0.005;

        for _ in 0..self.octaves {
            let raw = self.simplex.get([sx * frequency, sz * frequency]);
            // Ridged: invert absolute value → sharp ridges
            let mut signal = 1.0 - raw.abs();
            // Square for sharper ridges
            signal *= signal;
            // Weight by previous octave
            signal *= weight;
            weight = (signal * 2.0).clamp(0.0, 1.0);

            value += signal * amplitude;
            max_amplitude += amplitude;
            amplitude *= self.persistence;
            frequency *= self.lacunarity;
        }

        (value / max_amplitude).clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ridged_in_range() {
        let noise = RidgedNoise::new(42, 6, 0.5, 2.0, 1.0);
        for x in 0..50 {
            for z in 0..50 {
                let v = noise.sample(x as f64 * 3.0, z as f64 * 3.0);
                assert!(
                    (0.0..=1.0).contains(&v),
                    "Ridged value {} out of range at ({}, {})",
                    v,
                    x,
                    z
                );
            }
        }
    }
}
