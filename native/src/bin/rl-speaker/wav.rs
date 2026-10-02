//! Reads a slice of a WAV file (16 kHz, mono, 16-bit PCM: what main writes) as f32 samples.

use std::fs;

pub const SAMPLE_RATE: u32 = 16_000;
const BYTES_PER_SAMPLE: usize = 2;

/// The samples of `start..end` seconds. Times are clamped to the file, so a segment that
/// whisper timed slightly past the end of the audio still works.
pub fn read_slice(path: &str, start: f64, end: f64) -> Result<Vec<f32>, String> {
    let bytes = fs::read(path).map_err(|error| format!("{path}: {error}"))?;
    let data = pcm_data(&bytes)?;
    let total = data.len() / BYTES_PER_SAMPLE;
    let from = sample_index(start, total);
    let to = sample_index(end, total).max(from);
    Ok(data[from * BYTES_PER_SAMPLE..to * BYTES_PER_SAMPLE]
        .chunks_exact(BYTES_PER_SAMPLE)
        .map(|pair| f32::from(i16::from_le_bytes([pair[0], pair[1]])) / 32768.0)
        .collect())
}

fn sample_index(seconds: f64, total: usize) -> usize {
    let index = (seconds.max(0.0) * f64::from(SAMPLE_RATE)).round() as usize;
    index.min(total)
}

/// The `data` chunk of a 16 kHz mono 16-bit WAV.
fn pcm_data(bytes: &[u8]) -> Result<&[u8], String> {
    if bytes.len() < 12 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("not a WAV file".to_owned());
    }
    let mut position = 12;
    let mut format_ok = false;
    while position + 8 <= bytes.len() {
        let id = &bytes[position..position + 4];
        let size = u32::from_le_bytes(bytes[position + 4..position + 8].try_into().unwrap());
        let body = position + 8;
        let end = (body + size as usize).min(bytes.len());
        if id == b"fmt " && end - body >= 16 {
            let channels = u16::from_le_bytes([bytes[body + 2], bytes[body + 3]]);
            let rate = u32::from_le_bytes(bytes[body + 4..body + 8].try_into().unwrap());
            let bits = u16::from_le_bytes([bytes[body + 14], bytes[body + 15]]);
            format_ok = channels == 1 && rate == SAMPLE_RATE && bits == 16;
        } else if id == b"data" {
            return if format_ok {
                Ok(&bytes[body..end])
            } else {
                Err("WAV must be 16 kHz mono 16-bit".to_owned())
            };
        }
        position = body + size as usize + (size as usize & 1);
    }
    Err("WAV has no data chunk".to_owned())
}

#[cfg(test)]
mod tests {
    use super::pcm_data;

    fn wav(samples: &[i16]) -> Vec<u8> {
        let data: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
        let mut bytes = b"RIFF".to_vec();
        bytes.extend((36 + data.len() as u32).to_le_bytes());
        bytes.extend(b"WAVEfmt ");
        bytes.extend(16u32.to_le_bytes());
        bytes.extend(1u16.to_le_bytes());
        bytes.extend(1u16.to_le_bytes());
        bytes.extend(16_000u32.to_le_bytes());
        bytes.extend(32_000u32.to_le_bytes());
        bytes.extend(2u16.to_le_bytes());
        bytes.extend(16u16.to_le_bytes());
        bytes.extend(b"data");
        bytes.extend((data.len() as u32).to_le_bytes());
        bytes.extend(data);
        bytes
    }

    #[test]
    fn finds_the_data_chunk() {
        let bytes = wav(&[1, 2, 3]);
        assert_eq!(pcm_data(&bytes).unwrap().len(), 6);
    }

    #[test]
    fn rejects_other_formats_and_garbage() {
        let mut bytes = wav(&[1]);
        bytes[24..28].copy_from_slice(&44_100u32.to_le_bytes());
        assert!(pcm_data(&bytes).is_err());
        assert!(pcm_data(b"nope").is_err());
    }
}
