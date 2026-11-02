/**
 * Mobile haptic feedback helper using navigator.vibrate
 */

export function triggerHaptic(
  type: 'tap' | 'roll' | 'crit-success' | 'crit-fail' | 'remove' = 'tap',
  enabled = true
) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'tap':
        navigator.vibrate(15);
        break;
      case 'remove':
        navigator.vibrate(25);
        break;
      case 'roll':
        navigator.vibrate([25, 30, 40]);
        break;
      case 'crit-success':
        navigator.vibrate([30, 40, 60, 40, 100]);
        break;
      case 'crit-fail':
        navigator.vibrate([80, 50, 120]);
        break;
    }
  } catch {
    // Unsupported or blocked
  }
}
