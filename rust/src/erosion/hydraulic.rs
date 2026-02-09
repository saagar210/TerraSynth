use crate::TerrainConfig;

struct Droplet {
    x: f64,
    z: f64,
    dir_x: f64,
    dir_z: f64,
    speed: f64,
    water: f64,
    sediment: f64,
}

const MAX_LIFETIME: u32 = 30;
const GRAVITY: f64 = 4.0;
const MIN_SLOPE: f64 = 0.01;
const EROSION_RADIUS: i32 = 3;

pub fn erode(heightmap: &mut [f32], width: u32, height: u32, config: &TerrainConfig) {
    let w = width as usize;
    let h = height as usize;
    if w < 3 || h < 3 {
        return;
    }

    // Simple LCG random for reproducibility without pulling in rand
    let mut rng_state: u64 = config.seed.wrapping_mul(6364136223846793005).wrapping_add(1);
    let mut next_random = || -> f64 {
        rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        ((rng_state >> 33) as f64) / (u32::MAX as f64)
    };

    for _ in 0..config.erosion_iterations {
        let start_x = next_random() * (w as f64 - 2.0) + 1.0;
        let start_z = next_random() * (h as f64 - 2.0) + 1.0;

        let mut drop = Droplet {
            x: start_x,
            z: start_z,
            dir_x: 0.0,
            dir_z: 0.0,
            speed: 1.0,
            water: 1.0,
            sediment: 0.0,
        };

        for _ in 0..MAX_LIFETIME {
            let ix = drop.x as usize;
            let iz = drop.z as usize;

            if ix < 1 || ix >= w - 1 || iz < 1 || iz >= h - 1 {
                break;
            }

            // Bilinear interpolation position within cell
            let fx = drop.x - ix as f64;
            let fz = drop.z - iz as f64;

            // Calculate gradient from surrounding heights
            let idx = iz * w + ix;
            let h00 = heightmap[idx] as f64;
            let h10 = heightmap[idx + 1] as f64;
            let h01 = heightmap[idx + w] as f64;
            let h11 = heightmap[idx + w + 1] as f64;

            let grad_x = (h10 - h00) * (1.0 - fz) + (h11 - h01) * fz;
            let grad_z = (h01 - h00) * (1.0 - fx) + (h11 - h10) * fx;

            // Update direction with inertia
            drop.dir_x = drop.dir_x * config.erosion_inertia - grad_x * (1.0 - config.erosion_inertia);
            drop.dir_z = drop.dir_z * config.erosion_inertia - grad_z * (1.0 - config.erosion_inertia);

            // Normalize direction
            let len = (drop.dir_x * drop.dir_x + drop.dir_z * drop.dir_z).sqrt();
            if len < 1e-10 {
                // Random direction if flat
                let angle = next_random() * std::f64::consts::TAU;
                drop.dir_x = angle.cos();
                drop.dir_z = angle.sin();
            } else {
                drop.dir_x /= len;
                drop.dir_z /= len;
            }

            // Move droplet
            let new_x = drop.x + drop.dir_x;
            let new_z = drop.z + drop.dir_z;

            let nix = new_x as usize;
            let niz = new_z as usize;
            if nix < 1 || nix >= w - 1 || niz < 1 || niz >= h - 1 {
                break;
            }

            // Height at new position (bilinear)
            let nfx = new_x - nix as f64;
            let nfz = new_z - niz as f64;
            let nidx = niz * w + nix;
            let new_height = heightmap[nidx] as f64 * (1.0 - nfx) * (1.0 - nfz)
                + heightmap[nidx + 1] as f64 * nfx * (1.0 - nfz)
                + heightmap[nidx + w] as f64 * (1.0 - nfx) * nfz
                + heightmap[nidx + w + 1] as f64 * nfx * nfz;

            let old_height = h00 * (1.0 - fx) * (1.0 - fz)
                + h10 * fx * (1.0 - fz)
                + h01 * (1.0 - fx) * fz
                + h11 * fx * fz;

            let height_diff = new_height - old_height;

            // Calculate sediment capacity
            let capacity = (-height_diff).max(MIN_SLOPE) * drop.speed * drop.water * config.erosion_capacity;

            if drop.sediment > capacity || height_diff > 0.0 {
                // Deposit sediment
                let deposit_amount = if height_diff > 0.0 {
                    height_diff.min(drop.sediment)
                } else {
                    (drop.sediment - capacity) * config.erosion_deposition
                };

                drop.sediment -= deposit_amount;
                // Deposit at old position using bilinear weights
                let da = deposit_amount as f32;
                heightmap[idx] += da * (1.0 - fx as f32) * (1.0 - fz as f32);
                heightmap[idx + 1] += da * fx as f32 * (1.0 - fz as f32);
                heightmap[idx + w] += da * (1.0 - fx as f32) * fz as f32;
                heightmap[idx + w + 1] += da * fx as f32 * fz as f32;
            } else {
                // Erode terrain
                let erode_amount = ((capacity - drop.sediment) * config.erosion_erosion_rate).min(-height_diff);

                // Erode in a radius for smoother results
                let total_weight = apply_erosion_radius(
                    heightmap,
                    w,
                    h,
                    ix as i32,
                    iz as i32,
                    erode_amount as f32,
                );
                if total_weight > 0.0 {
                    drop.sediment += erode_amount;
                }
            }

            // Update speed and water
            drop.speed = ((drop.speed * drop.speed + height_diff * GRAVITY).max(0.0)).sqrt();
            drop.water *= 1.0 - config.erosion_evaporation;
            drop.x = new_x;
            drop.z = new_z;

            if drop.water < 0.001 {
                break;
            }
        }
    }
}

fn apply_erosion_radius(
    heightmap: &mut [f32],
    w: usize,
    h: usize,
    cx: i32,
    cz: i32,
    amount: f32,
) -> f32 {
    let mut total_weight: f32 = 0.0;
    let mut weights: Vec<(usize, f32)> = Vec::with_capacity((EROSION_RADIUS * 2 + 1).pow(2) as usize);

    for dz in -EROSION_RADIUS..=EROSION_RADIUS {
        for dx in -EROSION_RADIUS..=EROSION_RADIUS {
            let px = cx + dx;
            let pz = cz + dz;
            if px < 0 || px >= w as i32 || pz < 0 || pz >= h as i32 {
                continue;
            }
            let dist = ((dx * dx + dz * dz) as f32).sqrt();
            if dist > EROSION_RADIUS as f32 {
                continue;
            }
            let weight = (1.0 - dist / EROSION_RADIUS as f32).max(0.0);
            total_weight += weight;
            weights.push((pz as usize * w + px as usize, weight));
        }
    }

    if total_weight > 0.0 {
        for (idx, weight) in weights {
            let erode = amount * (weight / total_weight);
            heightmap[idx] = (heightmap[idx] - erode).max(0.0);
        }
    }

    total_weight
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn erosion_does_not_panic() {
        let mut config = TerrainConfig::new(42);
        config.erosion_iterations = 100;
        let mut heightmap = vec![0.5f32; 32 * 32];
        // Create a simple slope
        for z in 0..32 {
            for x in 0..32 {
                heightmap[z * 32 + x] = (z as f32) / 32.0;
            }
        }
        erode(&mut heightmap, 32, 32, &config);
        // Should not contain NaN
        assert!(heightmap.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn erosion_modifies_terrain() {
        let mut config = TerrainConfig::new(42);
        config.erosion_iterations = 1000;
        let mut heightmap = vec![0.5f32; 32 * 32];
        for z in 0..32 {
            for x in 0..32 {
                heightmap[z * 32 + x] = (z as f32) / 32.0;
            }
        }
        let original: Vec<f32> = heightmap.clone();
        erode(&mut heightmap, 32, 32, &config);
        let changed = heightmap.iter().zip(original.iter()).any(|(a, b)| (a - b).abs() > 1e-6);
        assert!(changed, "Erosion should modify the heightmap");
    }

    #[test]
    fn erosion_preserves_bounds() {
        let mut config = TerrainConfig::new(42);
        config.erosion_iterations = 500;
        let mut heightmap = vec![0.5f32; 32 * 32];
        for z in 0..32 {
            for x in 0..32 {
                heightmap[z * 32 + x] = (z as f32) / 32.0;
            }
        }
        erode(&mut heightmap, 32, 32, &config);
        assert!(
            heightmap.iter().all(|v| *v >= 0.0 && v.is_finite()),
            "No values should be negative or NaN"
        );
    }
}
