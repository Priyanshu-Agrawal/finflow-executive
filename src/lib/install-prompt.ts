/**
 * Whether to show the "Install FinFlow" bar. Owner decision, 13 Nov 2026: PWA install is for
 * mobile only — laptop and desktop already have the website and don't need installing. The
 * browser must also have offered, we must not already be running standalone, and the person
 * must not have dismissed it before.
 */
export function shouldShowInstallPrompt(state: { promptAvailable: boolean; isStandalone: boolean; dismissed: boolean; isMobile: boolean }): boolean {
  return state.isMobile && state.promptAvailable && !state.isStandalone && !state.dismissed;
}
