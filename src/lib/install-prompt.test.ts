import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowInstallPrompt } from './install-prompt';

// Owner decision, 13 Nov 2026: PWA install is for mobile; laptop/desktop already has the website.
const base = { promptAvailable: true, isStandalone: false, dismissed: false, isMobile: true };

test('shows on mobile when the browser offered to install, not standalone, and never dismissed', () => {
  assert.equal(shouldShowInstallPrompt(base), true);
});

test('never shows on laptop or desktop, even if the browser offers and nothing else blocks it', () => {
  assert.equal(shouldShowInstallPrompt({ ...base, isMobile: false }), false);
});

test('never shows without a browser install offer', () => {
  assert.equal(shouldShowInstallPrompt({ ...base, promptAvailable: false }), false);
});

test('never shows once already running standalone (installed)', () => {
  assert.equal(shouldShowInstallPrompt({ ...base, isStandalone: true }), false);
});

test('never shows again after the person dismissed it', () => {
  assert.equal(shouldShowInstallPrompt({ ...base, dismissed: true }), false);
});
