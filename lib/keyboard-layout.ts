/**
 * Modal forms use padding so their bottom action bar moves above the keyboard.
 * Android is configured to pan the window, avoiding a second resize pass.
 */
export function getKeyboardAvoidingBehavior(_platform: string): "padding" {
  return "padding";
}
