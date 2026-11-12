import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rupees, signedRupees } from './format';

test('rupees uses Indian grouping and a real minus sign', () => {
  assert.equal(rupees(114021), '₹1,14,021');
  assert.equal(rupees(-37865), '−₹37,865');
  assert.equal(rupees(0), '₹0');
  assert.equal(rupees(1234.6), '₹1,235');
});

test('signedRupees always shows a sign', () => {
  assert.equal(signedRupees(18400), '+₹18,400');
  assert.equal(signedRupees(-37865), '−₹37,865');
  assert.equal(signedRupees(0), '+₹0');
});

test('non-finite values never print NaN', () => {
  assert.equal(rupees(NaN), '₹0');
  assert.equal(signedRupees(Infinity), '+₹0');
});
