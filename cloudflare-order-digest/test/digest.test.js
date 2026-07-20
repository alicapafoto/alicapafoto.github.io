import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMessage, localParts, summarize } from '../src/index.js';

test('Lisbon local time follows daylight saving', () => {
  assert.deepEqual(localParts(new Date('2026-07-17T21:05:00Z'), 'Europe/Lisbon'), { date: '2026-07-17', hour: 22 });
  assert.deepEqual(localParts(new Date('2026-12-17T22:05:00Z'), 'Europe/Lisbon'), { date: '2026-12-17', hour: 22 });
});

test('digest totals and privacy-safe order summary', () => {
  const row = Array(43).fill('');
  row[0] = '2026-07-17T12:00:00.000Z';
  row[1] = 'acf_test';
  row[4] = 'Paid — Awaiting Wise';
  row[5] = 'No';
  row[6] = 'Not ordered';
  row[7] = 'AtaquaS';
  row[10] = '30 × 45 cm';
  row[14] = '12.26';
  row[15] = '42.26';
  row[20] = '20.94';
  row[21] = '20.44';
  row[28] = 'PT';
  row[29] = 'Ali';
  row[30] = 'collector@example.com';
  row[31] = '+351000000000';
  row[32] = 'Private address';
  const summary = summarize([row]);
  assert.equal(summary.customer, 42.26);
  assert.equal(summary.awaitingWise, 1);
  const message = buildMessage('2026-07-17', [row], summary, {
    ORDER_DIGEST_TO_EMAIL: 'alicapafoto@gmail.com',
    ORDER_DIGEST_FROM_EMAIL: 'orders@alicapa.com',
  });
  assert.match(message.text, /AtaquaS/);
  assert.doesNotMatch(message.text, /Private address/);
  assert.doesNotMatch(message.text, /351000/);
});
