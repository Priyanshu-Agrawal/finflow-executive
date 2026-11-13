/** Whether to show the "Install FinFlow" bar: the browser offered, we are not already installed and running standalone, and the person has not dismissed it before. */
export function shouldShowInstallPrompt(state: { promptAvailable: boolean; isStandalone: boolean; dismissed: boolean }): boolean {
  return state.promptAvailable && !state.isStandalone && !state.dismissed;
}
