/* =============================================================================
 * core.test.js — Test thuần Node cho các hàm LÕI không phụ thuộc trình duyệt.
 * Chạy: node tests/core.test.js   (exit 0 = pass, 1 = fail)
 *
 * Chỉ test hàm "pure" (CSV parse, VN2000, DXF, helper). Các hàm cần DOM/canvas
 * (core-image.resize) hoặc mạng (fetch, postToGas) KHÔNG test ở đây.
 * ========================================================================== */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

// ── Nạp core IIFE vào globalThis (giống trình duyệt gắn vào window.CSGT) ──────
globalThis.CSGT = {};
function loadCore(name) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'core', name), 'utf8');
  vm.runInThisContext(code, { filename: name });
}
loadCore('core-sync.js');
loadCore('core-export.js');

// ── Mini test runner ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + e.message); }
}
const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;

// ── core-sync: CSV parser ────────────────────────────────────────────────────
console.log('\ncore-sync — parseCsvRows / parseCsvToObjects');
const S = CSGT.sync;

test('hàng đơn giản', () => {
  assert.deepStrictEqual(S.parseCsvRows('a,b,c'), [['a', 'b', 'c']]);
});
test('nhiều hàng', () => {
  assert.deepStrictEqual(S.parseCsvRows('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});
test('dấu phẩy trong ô có nháy', () => {
  assert.deepStrictEqual(S.parseCsvRows('"a,b",c'), [['a,b', 'c']]);
});
test('escape "" thành một dấu nháy', () => {
  assert.deepStrictEqual(S.parseCsvRows('"He said ""hi""",x'), [['He said "hi"', 'x']]);
});
test('xuống dòng trong ô có nháy', () => {
  assert.deepStrictEqual(S.parseCsvRows('"dòng1\ndòng2",b'), [['dòng1\ndòng2', 'b']]);
});
test('CRLF được chuẩn hóa', () => {
  assert.deepStrictEqual(S.parseCsvRows('a,b\r\n1,2'), [['a', 'b'], ['1', '2']]);
});
test('chuỗi rỗng → []', () => {
  assert.deepStrictEqual(S.parseCsvRows(''), []);
});
test('parseCsvToObjects ánh xạ header', () => {
  const objs = S.parseCsvToObjects('ID,Tên\n1,Trụ A\n2,Trụ B');
  assert.deepStrictEqual(objs, [{ ID: '1', 'Tên': 'Trụ A' }, { ID: '2', 'Tên': 'Trụ B' }]);
});
test('parseCsvToObjects bỏ cột header rỗng', () => {
  const objs = S.parseCsvToObjects('ID,,Tên\n1,x,A');
  assert.deepStrictEqual(objs, [{ ID: '1', 'Tên': 'A' }]);
});
test('ô thiếu → chuỗi rỗng', () => {
  const objs = S.parseCsvToObjects('a,b,c\n1,2');
  assert.strictEqual(objs[0].c, '');
});

// ── core-export: VN2000 ──────────────────────────────────────────────────────
console.log('\ncore-export — latLonToVN2000');
const E = CSGT.export;

test('zone 48 cho kinh độ ~106.67 (Nam Bộ)', () => {
  assert.strictEqual(E.latLonToVN2000(10.6107, 106.6709).zone, 48);
});
test('regression: tọa độ Cần Giuộc (10.6107, 106.6709)', () => {
  const r = E.latLonToVN2000(10.6107, 106.6709);
  assert.ok(near(r.x, 682795.187, 1e-2), 'x=' + r.x);
  assert.ok(near(r.y, 1173425.791, 1e-2), 'y=' + r.y);
});
test('x, y hữu hạn và dương ở Nam Bộ', () => {
  const r = E.latLonToVN2000(10.5, 106.6);
  assert.ok(Number.isFinite(r.x) && r.x > 0);
  assert.ok(Number.isFinite(r.y) && r.y > 0);
});

// ── core-export: DXF ─────────────────────────────────────────────────────────
console.log('\ncore-export — buildDxf');
test('DXF có cấu trúc SECTION/ENTITIES/EOF', () => {
  const dxf = E.buildDxf([{ lat: 10.6, lon: 106.6, label: 'P1' }]);
  ['SECTION', 'ENTITIES', 'CIRCLE', 'EOF'].forEach((t) => assert.ok(dxf.includes(t), 'thiếu ' + t));
});
test('DXF bỏ qua điểm tọa độ không hợp lệ', () => {
  const dxf = E.buildDxf([{ lat: NaN, lon: 106.6 }, { lat: 10.6, lon: 106.6 }]);
  assert.strictEqual((dxf.match(/CIRCLE/g) || []).length, 1);
});
test('connectLines thêm LINE giữa 2 điểm', () => {
  const dxf = E.buildDxf(
    [{ lat: 10.6, lon: 106.6 }, { lat: 10.61, lon: 106.61 }],
    { connectLines: true });
  assert.ok(dxf.includes('LINE'));
});
test('không có điểm → vẫn ra DXF hợp lệ', () => {
  const dxf = E.buildDxf([]);
  assert.ok(dxf.includes('EOF') && !dxf.includes('CIRCLE'));
});

// ── Tổng kết ─────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────');
console.log('PASS ' + pass + ' · FAIL ' + fail);
process.exit(fail ? 1 : 0);
