use noise::{NoiseFn, Simplex};

pub struct WarpedNoise {
    primary: Simplex,
    warp_x: Simplex,
    warp_z: Simplex,
    warp_strength: f64,
    octaves: u32,
    persistence: f64,
    lacunarity: f64,
    scale: f64,
}

impl WarpedNoise {
    pub fn new(
        seed: u64,
        warp_strength: f64,
        octaves: u32,
        persistence: f64,
        lacunarity: f64,
        scale: f64,
    ) -> Self {
        let s = (seed & 0xFFFFFFFF) as u32;
        Self {
            primary: Simplex::new(s),
            warp_x: Simplex::new(s.wrapping_add(1000)),
            warp_z: Simplex::new(s.wrapping_add(2000)),
            warp_strength,
            octaves: octaves.max(1),
            persistence,
            lacunarity,
            scale,
        }
    }

    pub fn sample(&self, world_x: f64, world_z: f64) -> f64 {
        let sx = world_x * self.scale * 0.005;
        let sz = world_z * self.scale * 0.005;

        // Domain warping: offset coordinates by noise
        let warp_scale = 0.003;
        let wx = self.warp_x.get([world_x * warp_scale, world_z * warp_scale]) * self.warp_strength;
        let wz = self.warp_z.get([world_x * warp_scale, world_z * warp_scale]) * self.warp_strength;

        let warped_x = sx + wx;
        let warped_z = sz + wz;

        let mut amplitude = 1.0;
        let mut frequency = 1.0;
        let mut value = 0.0;
        let mut max_amplitude = 0.0;

        for _ in 0..self.octaves {
            let sample = self.primary.get([warped_x * frequency, warped_z * frequency]);
            value += sample * amplitude;
            max_amplitude += amplitude;
            amplitude *= self.persistence;
            frequency *= self.lacunarity;
        }

        let normalized = (value / max_amplitude + 1.0) * 0.5;
        normalized.clamp(0.0, 1.0)
    }
}
