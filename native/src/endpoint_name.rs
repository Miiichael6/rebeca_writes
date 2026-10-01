//! Splitting a Windows endpoint name into its short name and hardware group.
//!
//! WASAPI names an endpoint `"<what it is> (<hardware it belongs to>)"`, for
//! example `"Altavoces (Realtek(R) Audio)"`. The dropdown shows the short name
//! and groups the rows by hardware, so the two parts are separated here.
//!
//! The group itself may contain parentheses (`Realtek(R) Audio`), so the split
//! walks the trailing group backwards keeping track of depth instead of looking
//! for the first `(`.

/// The short name and the hardware group of a full endpoint name.
///
/// When the name carries no usable group, both come back as the full name: the
/// row still needs a heading to sit under.
pub fn parse_endpoint_name(full: &str) -> (String, String) {
    let trimmed = full.trim();
    match last_group(trimmed) {
        Some((open, close)) => {
            let short = trimmed[..open].trim();
            let group = trimmed[open + 1..close].trim();
            if short.is_empty() || group.is_empty() {
                (trimmed.to_owned(), trimmed.to_owned())
            } else {
                (short.to_owned(), group.to_owned())
            }
        }
        None => (trimmed.to_owned(), trimmed.to_owned()),
    }
}

/// Byte offsets of the `(` and `)` of the last balanced group, when the name
/// ends with one.
///
/// Parentheses are ASCII, so scanning bytes is safe on a UTF-8 string: a
/// multi-byte character never contains an ASCII byte.
fn last_group(s: &str) -> Option<(usize, usize)> {
    let bytes = s.as_bytes();
    let close = bytes.len().checked_sub(1)?;
    if bytes[close] != b')' {
        return None;
    }
    let mut depth = 1usize;
    for i in (0..close).rev() {
        match bytes[i] {
            b')' => depth += 1,
            b'(' => {
                depth -= 1;
                if depth == 0 {
                    return Some((i, close));
                }
            }
            _ => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::parse_endpoint_name;

    #[test]
    fn splits_a_plain_name() {
        let (name, group) = parse_endpoint_name("Auriculares (WH-1000XM4)");
        assert_eq!(name, "Auriculares");
        assert_eq!(group, "WH-1000XM4");
    }

    #[test]
    fn keeps_parentheses_nested_in_the_group() {
        let (name, group) = parse_endpoint_name("Altavoces (Realtek(R) Audio)");
        assert_eq!(name, "Altavoces");
        assert_eq!(group, "Realtek(R) Audio");
    }

    #[test]
    fn falls_back_to_the_full_name_without_parentheses() {
        let (name, group) = parse_endpoint_name("Some Bare Device");
        assert_eq!(name, "Some Bare Device");
        assert_eq!(group, "Some Bare Device");
    }

    #[test]
    fn splits_on_the_last_group_when_there_are_several() {
        let (name, group) = parse_endpoint_name("Line In (rear) (Realtek(R) Audio)");
        assert_eq!(name, "Line In (rear)");
        assert_eq!(group, "Realtek(R) Audio");
    }

    #[test]
    fn treats_an_empty_group_as_no_group() {
        let (name, group) = parse_endpoint_name("Micrófono ()");
        assert_eq!(name, "Micrófono ()");
        assert_eq!(group, "Micrófono ()");
    }

    #[test]
    fn treats_a_missing_short_name_as_no_group() {
        let (name, group) = parse_endpoint_name("(VB-Audio Virtual Cable)");
        assert_eq!(name, "(VB-Audio Virtual Cable)");
        assert_eq!(group, "(VB-Audio Virtual Cable)");
    }

    #[test]
    fn handles_an_empty_name() {
        let (name, group) = parse_endpoint_name("");
        assert_eq!(name, "");
        assert_eq!(group, "");
    }

    #[test]
    fn ignores_an_unbalanced_group() {
        let (name, group) = parse_endpoint_name("Weird name)");
        assert_eq!(name, "Weird name)");
        assert_eq!(group, "Weird name)");
    }
}
