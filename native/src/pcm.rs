//! Binary PCM blocks written to stdout:
//! `[streamId u8][channels u16 LE][frameCount u32 LE][frameCount × channels × f32 LE]`.
//!
//! The channel count travels in every header because stdout and stderr are
//! separate pipes: main may read a block before the `opened` event.

use std::io::Write;

pub const HEADER_BYTES: usize = 7;

/// Serializes one block. `samples` are interleaved, so `frames = len / channels`.
pub fn encode_block(stream_id: u8, channels: u16, samples: &[f32]) -> Vec<u8> {
    let frames = samples.len() / usize::from(channels.max(1));
    let mut block = Vec::with_capacity(HEADER_BYTES + frames * usize::from(channels) * 4);
    block.push(stream_id);
    block.extend_from_slice(&channels.to_le_bytes());
    block.extend_from_slice(&(frames as u32).to_le_bytes());
    for sample in &samples[..frames * usize::from(channels)] {
        block.extend_from_slice(&sample.to_le_bytes());
    }
    block
}

/// Writes one block to stdout in a single locked write, so blocks from two
/// streams never interleave.
pub fn write_block(block: &[u8]) {
    let mut stdout = std::io::stdout().lock();
    // A closed pipe means main is gone; stdin will close too and end the process.
    let _ = stdout.write_all(block);
    let _ = stdout.flush();
}

#[cfg(test)]
mod tests {
    use super::encode_block;

    #[test]
    fn writes_header_and_little_endian_samples() {
        let block = encode_block(3, 2, &[0.5, -1.0]);
        assert_eq!(block[0], 3);
        assert_eq!(&block[1..3], &2u16.to_le_bytes());
        assert_eq!(&block[3..7], &1u32.to_le_bytes());
        assert_eq!(&block[7..11], &0.5f32.to_le_bytes());
        assert_eq!(&block[11..15], &(-1.0f32).to_le_bytes());
        assert_eq!(block.len(), 15);
    }

    #[test]
    fn drops_a_trailing_partial_frame() {
        let block = encode_block(1, 2, &[0.1, 0.2, 0.3]);
        assert_eq!(&block[3..7], &1u32.to_le_bytes());
        assert_eq!(block.len(), 7 + 8);
    }
}
