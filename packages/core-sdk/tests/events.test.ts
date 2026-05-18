/**
 * core-sdk/tests/events.test.ts
 *
 * Tests for the EventEmitter class: on, off, emit, once, removeAllListeners, listenerCount.
 */

import { EventEmitter } from '../src/events.js';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// --- on + emit ---

function testOnAndEmit() {
  const ee = new EventEmitter();
  let result: unknown;
  ee.on('test', (val) => { result = val; });
  ee.emit('test', 'hello');
  assert(result === 'hello', 'handler should receive emitted value');
  console.log('✓ on + emit');
}

// --- multiple listeners ---

function testMultipleListeners() {
  const ee = new EventEmitter();
  const order: number[] = [];
  ee.on('data', () => order.push(1));
  ee.on('data', () => order.push(2));
  ee.on('data', () => order.push(3));
  ee.emit('data');
  assert(order.length === 3, 'all three handlers should fire');
  assert(order[0] === 1 && order[1] === 2 && order[2] === 3, 'handlers should fire in order');
  console.log('✓ multiple listeners');
}

// --- off ---

function testOff() {
  const ee = new EventEmitter();
  let count = 0;
  const handler = () => { count++; };
  ee.on('inc', handler);
  ee.emit('inc');
  assert(count === 1, 'handler should fire once before removal');
  ee.off('inc', handler);
  ee.emit('inc');
  assert(count === 1, 'handler should not fire after off');
  console.log('✓ off');
}

// --- once ---

function testOnce() {
  const ee = new EventEmitter();
  let count = 0;
  ee.once('once_event', () => { count++; });
  ee.emit('once_event');
  assert(count === 1, 'once handler should fire first time');
  ee.emit('once_event');
  assert(count === 1, 'once handler should NOT fire second time');
  console.log('✓ once');
}

// --- emit with multiple args ---

function testEmitMultipleArgs() {
  const ee = new EventEmitter();
  let a: unknown, b: unknown, c: unknown;
  ee.on('multi', (x, y, z) => { a = x; b = y; c = z; });
  ee.emit('multi', 1, 'two', { three: true });
  assert(a === 1, 'first arg');
  assert(b === 'two', 'second arg');
  assert((c as any).three === true, 'third arg');
  console.log('✓ emit multiple args');
}

// --- listenerCount ---

function testListenerCount() {
  const ee = new EventEmitter();
  assert(ee.listenerCount('x') === 0, 'no listeners initially');
  const h1 = () => {};
  ee.on('x', h1);
  assert(ee.listenerCount('x') === 1, 'one listener after on');
  const h2 = () => {};
  ee.on('x', h2);
  assert(ee.listenerCount('x') === 2, 'two listeners');
  ee.off('x', h1);
  assert(ee.listenerCount('x') === 1, 'one after off');
  console.log('✓ listenerCount');
}

// --- removeAllListeners ---

function testRemoveAllListeners() {
  const ee = new EventEmitter();
  ee.on('a', () => {});
  ee.on('a', () => {});
  ee.on('b', () => {});
  assert(ee.listenerCount('a') === 2, 'a has 2 listeners');
  assert(ee.listenerCount('b') === 1, 'b has 1 listener');

  ee.removeAllListeners('a');
  assert(ee.listenerCount('a') === 0, 'a should be cleared');
  assert(ee.listenerCount('b') === 1, 'b should be unaffected');

  ee.removeAllListeners();
  assert(ee.listenerCount('b') === 0, 'all should be cleared');
  console.log('✓ removeAllListeners');
}

// --- emit with no listeners ---

function testEmitNoListeners() {
  const ee = new EventEmitter();
  // Should not throw
  ee.emit('nothing', 'ignored');
  console.log('✓ emit with no listeners');
}

// --- event handler error does not break others ---

function testHandlerError() {
  const ee = new EventEmitter();
  let secondFired = false;
  ee.on('err', () => { throw new Error('boom'); });
  ee.on('err', () => { secondFired = true; });
  // Should not throw; errors are caught internally
  ee.emit('err');
  assert(secondFired === true, 'second handler should still fire after first throws');
  console.log('✓ handler error isolation');
}

// --- off removes last handler cleans up ---

function testOffCleansUp() {
  const ee = new EventEmitter();
  const h = () => {};
  ee.on('x', h);
  ee.off('x', h);
  assert(ee.listenerCount('x') === 0, 'listener count should be 0');
  console.log('✓ off cleans up empty listener set');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  const tests = [
    testOnAndEmit,
    testMultipleListeners,
    testOff,
    testOnce,
    testEmitMultipleArgs,
    testListenerCount,
    testRemoveAllListeners,
    testEmitNoListeners,
    testHandlerError,
    testOffCleansUp,
  ];

  let passed = 0;
  let failed = 0;

  for (const fn of tests) {
    try {
      fn();
      passed++;
    } catch (e: any) {
      console.error(`✗ ${fn.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (${tests.length} total)`);
  if (failed > 0) process.exit(1);
}

run();
