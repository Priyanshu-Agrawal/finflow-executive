import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowInstallPrompt } from './install-prompt';

test('shows when the browser offered to install, not standalone, and never dismissed', () => {
  assert.equal(shouldShowInstallPrompt({ promptAvailable: true, isStandalone: false, dismissed: false }), true);
});

test('never shows without a browser install offer', () => {
  assert.equal(shouldShowInstallPrompt({ promptAvailable: false, isStandalone: false, dismissed: false }), false);
});

test('never shows once already running standalone (installed)', () => {
  assert.equal(shouldShowInstallPrompt({ promptAvailable: true, isStandalone: true, dismissed: false }), false);
});

test('never shows again after the person dismissed it', () => {
  assert.equal(shouldShowInstallPrompt({ promptAvailable: true, isStandalone: false, dismissed: true }), false);
});
