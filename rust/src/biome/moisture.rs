use noise::{NoiseFn, Simplex};

pub struct MoistureGenerator {
    simplex: Simplex,
    scale: f64,
    octaves: u32,
    persistence: f64,
}

impl MoistureGenerator {
    pub fn new(seed: u64, scale: f64) -> Self {
        // Offset seed to avoid correlation with elevation noise
        let seed_u32 = ((seed.wrapping_add(7777)) & 0xFFFFFFFF) as u32;
        Self {
            simplex: Simplex::new(seed_u32),
            scale,
            octaves: 4,
            persistence: 0.5,
        }
    }

    pub fn sample(&self, world_x: f64, world_z: f64) -> f32 {
        let mut amplitude = 1.0;
        let mut frequency = 1.0;
        let mut value = 0.0;
        let mut max_amplitude = 0.0;

        let sx = world_x * self.scale * 0.003;
        let sz = world_z * self.scale * 0.003;

        for _ in 0..self.octaves {
            let sample = self.simplex.get([sx * frequency, sz * frequency]);
            value += sample * amplitude;
            max_amplitude += amplitude;
            amplitude *= self.persistence;
            frequency *= 2.0;
        }

        let normalized = (value / max_amplitude + 1.0) * 0.5;
        normalized.clamp(0.0, 1.0) as f32
    }
}
