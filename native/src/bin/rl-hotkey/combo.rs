//! Whether the watched combination is held, decided from keyboard hook events.
//!
//! Pure logic: the hook passes each key event plus a way to ask whether another key is held,
//! and gets back what to report and whether to touch the event.

use serde::Deserialize;

const VK_SHIFT: u16 = 0x10;
const VK_CONTROL: u16 = 0x11;
const VK_MENU: u16 = 0x12;
const VK_LWIN: u16 = 0x5B;
const VK_RWIN: u16 = 0x5C;
const VK_LSHIFT: u16 = 0xA0;
const VK_RSHIFT: u16 = 0xA1;
const VK_LCONTROL: u16 = 0xA2;
const VK_RCONTROL: u16 = 0xA3;
const VK_LMENU: u16 = 0xA4;
const VK_RMENU: u16 = 0xA5;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Modifier {
    Ctrl,
    Alt,
    Shift,
    Win,
}

const ALL_MODIFIERS: [Modifier; 4] = [
    Modifier::Ctrl,
    Modifier::Alt,
    Modifier::Shift,
    Modifier::Win,
];

impl Modifier {
    /// Left and right keys. The hook reports these, never the generic `VK_CONTROL`.
    fn keys(self) -> [u16; 2] {
        match self {
            Modifier::Ctrl => [VK_LCONTROL, VK_RCONTROL],
            Modifier::Alt => [VK_LMENU, VK_RMENU],
            Modifier::Shift => [VK_LSHIFT, VK_RSHIFT],
            Modifier::Win => [VK_LWIN, VK_RWIN],
        }
    }

    fn of(vk: u16) -> Option<Modifier> {
        ALL_MODIFIERS.into_iter().find(|m| m.keys().contains(&vk))
    }
}

/// Some drivers send the generic code; it counts as the left key.
fn specific(vk: u16) -> u16 {
    match vk {
        VK_CONTROL => VK_LCONTROL,
        VK_MENU => VK_LMENU,
        VK_SHIFT => VK_LSHIFT,
        other => other,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct Combo {
    pub modifiers: Vec<Modifier>,
    /// Virtual-key code of the non-modifier key, if any.
    pub key: Option<u16>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyEvent {
    Down,
    Up,
    Other,
}

/// What to do with one hook event.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Reaction {
    pub events: Vec<KeyEvent>,
    /// Drop the event: the combination's own key never reaches the focused app.
    pub swallow: bool,
    /// Drop this Win key-up and replay it after a dummy key, so Start does not open.
    pub mask_win_up: bool,
}

pub struct ComboTracker {
    combo: Combo,
    active: bool,
    /// The combination was complete since Win went down: releasing Win must not open Start.
    win_armed: bool,
    /// The combination's key, tracked here because swallowed keys never reach `GetAsyncKeyState`.
    key_down: bool,
    swallowing_key: bool,
}

impl ComboTracker {
    pub fn new(combo: Combo) -> Self {
        Self {
            combo,
            active: false,
            win_armed: false,
            key_down: false,
            swallowing_key: false,
        }
    }

    /// One real (not injected) key event. `held` says whether any other key is down right now.
    pub fn on_key(&mut self, vk: u16, down: bool, held: impl Fn(u16) -> bool) -> Reaction {
        let vk = specific(vk);
        let pressed = |k: u16| if k == vk { down } else { held(k) };
        let modifier_held = |m: Modifier| m.keys().into_iter().any(pressed);

        let is_combo_key = self.combo.key == Some(vk);
        if is_combo_key {
            self.key_down = down;
        }
        let modifiers_match = ALL_MODIFIERS
            .into_iter()
            .all(|m| modifier_held(m) == self.combo.modifiers.contains(&m));
        let key_match = self.combo.key.is_none() || self.key_down;
        let now_active = modifiers_match && key_match;

        let mut reaction = Reaction::default();
        let foreign = down && !is_combo_key && !self.is_combo_modifier(vk);
        let any_combo_modifier = self.combo.modifiers.iter().any(|&m| modifier_held(m));
        if foreign && (self.active || any_combo_modifier) {
            reaction.events.push(KeyEvent::Other);
        }
        if now_active != self.active {
            reaction.events.push(if now_active {
                KeyEvent::Down
            } else {
                KeyEvent::Up
            });
            self.active = now_active;
            if now_active && self.combo.modifiers.contains(&Modifier::Win) {
                self.win_armed = true;
            }
        }

        if is_combo_key {
            if down && modifiers_match {
                self.swallowing_key = true;
            }
            reaction.swallow = self.swallowing_key;
            if !down {
                self.swallowing_key = false;
            }
        }
        if !down && Modifier::of(vk) == Some(Modifier::Win) && self.win_armed {
            reaction.mask_win_up = true;
            self.win_armed = false;
        }
        reaction
    }

    fn is_combo_modifier(&self, vk: u16) -> bool {
        Modifier::of(vk).is_some_and(|m| self.combo.modifiers.contains(&m))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    const VK_RIGHT: u16 = 0x27;
    const VK_R: u16 = 0x52;

    /// Feeds key events like Windows would, keeping its own set of held keys.
    struct Keyboard {
        tracker: ComboTracker,
        held: HashSet<u16>,
    }

    impl Keyboard {
        fn new(modifiers: Vec<Modifier>, key: Option<u16>) -> Self {
            Self {
                tracker: ComboTracker::new(Combo { modifiers, key }),
                held: HashSet::new(),
            }
        }

        fn press(&mut self, vk: u16) -> Reaction {
            let held = self.held.clone();
            let reaction = self.tracker.on_key(vk, true, |k| held.contains(&k));
            self.held.insert(vk);
            reaction
        }

        fn release(&mut self, vk: u16) -> Reaction {
            let held = self.held.clone();
            let reaction = self.tracker.on_key(vk, false, |k| held.contains(&k));
            self.held.remove(&vk);
            reaction
        }
    }

    fn ctrl_win() -> Keyboard {
        Keyboard::new(vec![Modifier::Ctrl, Modifier::Win], None)
    }

    #[test]
    fn ctrl_win_goes_down_and_up() {
        let mut kb = ctrl_win();
        assert!(kb.press(VK_LCONTROL).events.is_empty());
        assert_eq!(kb.press(VK_LWIN).events, vec![KeyEvent::Down]);
        assert_eq!(kb.release(VK_LWIN).events, vec![KeyEvent::Up]);
        assert!(kb.release(VK_LCONTROL).events.is_empty());
    }

    #[test]
    fn order_and_side_do_not_matter() {
        let mut kb = ctrl_win();
        kb.press(VK_RWIN);
        assert_eq!(kb.press(VK_RCONTROL).events, vec![KeyEvent::Down]);
        assert_eq!(kb.release(VK_RCONTROL).events, vec![KeyEvent::Up]);
    }

    #[test]
    fn the_generic_code_counts_as_the_left_key() {
        let mut kb = ctrl_win();
        kb.press(VK_LWIN);
        assert_eq!(kb.press(VK_CONTROL).events, vec![KeyEvent::Down]);
    }

    #[test]
    fn double_press_of_win_with_ctrl_held() {
        let mut kb = ctrl_win();
        kb.press(VK_LCONTROL);
        assert_eq!(kb.press(VK_LWIN).events, vec![KeyEvent::Down]);
        assert_eq!(kb.release(VK_LWIN).events, vec![KeyEvent::Up]);
        assert_eq!(kb.press(VK_LWIN).events, vec![KeyEvent::Down]);
    }

    #[test]
    fn another_key_is_reported_and_ends_the_combination() {
        let mut kb = ctrl_win();
        kb.press(VK_LCONTROL);
        kb.press(VK_LWIN);
        assert_eq!(kb.press(VK_RIGHT).events, vec![KeyEvent::Other]);
        assert_eq!(
            kb.press(VK_LSHIFT).events,
            vec![KeyEvent::Other, KeyEvent::Up]
        );
    }

    #[test]
    fn an_extra_modifier_held_first_prevents_the_combination() {
        let mut kb = ctrl_win();
        kb.press(VK_LSHIFT);
        kb.press(VK_LCONTROL);
        assert!(kb.press(VK_LWIN).events.is_empty());
    }

    #[test]
    fn typing_without_combo_modifiers_reports_nothing() {
        let mut kb = ctrl_win();
        assert!(kb.press(VK_R).events.is_empty());
    }

    #[test]
    fn releasing_win_after_the_combination_is_masked_once() {
        let mut kb = ctrl_win();
        kb.press(VK_LCONTROL);
        kb.press(VK_LWIN);
        kb.release(VK_LCONTROL);
        assert!(kb.release(VK_LWIN).mask_win_up);
        kb.press(VK_LWIN);
        assert!(!kb.release(VK_LWIN).mask_win_up);
    }

    #[test]
    fn the_combination_key_is_swallowed_down_and_up() {
        let mut kb = Keyboard::new(vec![Modifier::Ctrl, Modifier::Shift], Some(VK_R));
        kb.press(VK_LCONTROL);
        kb.press(VK_LSHIFT);
        let down = kb.press(VK_R);
        assert_eq!(down.events, vec![KeyEvent::Down]);
        assert!(down.swallow);
        kb.release(VK_LSHIFT);
        assert!(kb.release(VK_R).swallow);
    }

    #[test]
    fn the_key_alone_is_not_swallowed() {
        let mut kb = Keyboard::new(vec![Modifier::Ctrl, Modifier::Shift], Some(VK_R));
        let down = kb.press(VK_R);
        assert!(!down.swallow);
        assert!(down.events.is_empty());
        assert!(!kb.release(VK_R).swallow);
    }
}
