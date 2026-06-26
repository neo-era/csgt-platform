/* =============================================================================
 * core-export.js — Tọa độ VN2000 + xuất CAD DXF + tải file
 * Hợp nhất convertLatLonToVn2000 (giống hệt ở 2 dự án), createDxfForMarkers
 * (lighting-survey: có nối tuyến + nhãn khoảng cách) và exportMarkersToCad
 * (dentat: chỉ điểm + nhãn). Gộp thành buildDxf có tùy chọn.
 *
 * Phụ thuộc: không. (Excel: cần ExcelJS hoặc SheetJS do module tự nạp.)
 * Xuất: window.CSGT.export
 * ========================================================================== */
(function (global) {
  'use strict';
  const CSGT = (global.CSGT = global.CSGT || {});

  // ── VN2000 (Transverse Mercator, ellipsoid WGS84, k0=0.9996, false E=500000) ─
  // Giống nhau ở cả hai dự án. Trả { x, y, zone }.
  function latLonToVN2000(lat, lon) {
    const toRad = (x) => x * Math.PI / 180;
    const a = 6378137.0, f = 1 / 298.257222101;
    const e2 = 2 * f - f * f, k0 = 0.9996;
    const zone = Math.floor((lon + 180) / 6) + 1;
    const lon0 = toRad(zone * 6 - 183);
    const phi = toRad(lat), lambda = toRad(lon);
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi), tanPhi = Math.tan(phi);
    const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
    const T = tanPhi * tanPhi, C = e2 / (1 - e2) * cosPhi * cosPhi;
    const A = (lambda - lon0) * cosPhi;
    const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
      - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
      + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
      - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
    const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * e2 / (1 - e2)) * A ** 5 / 120);
    const y = k0 * (M + N * tanPhi * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24
      + (61 - 58 * T + T * T + 600 * C - 330 * e2 / (1 - e2)) * A ** 6 / 720));
    return { x: x + 500000, y, zone };
  }

  // ── DXF ────────────────────────────────────────────────────────────────────
  // points: [{ lat, lon, label, layer }]  (layer mặc định '0')
  // opts: { connectLines=false, distanceLabels=false, precision=3, labelOffset=1.5 }
  //   connectLines  : nối CIRCLE liên tiếp bằng LINE (sơ đồ tuyến — kiểu khảo sát)
  //   distanceLabels: ghi nhãn khoảng cách giữa 2 điểm (cần connectLines)
  function buildDxf(points, opts = {}) {
    const { connectLines = false, distanceLabels = false, precision = 3, labelOffset = 1.5 } = opts;
    const out = [];
    const add = (t) => out.push(t);
    add('0'); add('SECTION'); add('2'); add('HEADER'); add('0'); add('ENDSEC');
    add('0'); add('SECTION'); add('2'); add('ENTITIES');
    let prev = null;
    points.forEach((p, i) => {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
      const vn = latLonToVN2000(p.lat, p.lon);
      const x = vn.x, y = vn.y;
      const label = String(p.label || ('P' + (i + 1))).replace(/\r?\n/g, ' ');
      const layer = p.layer || '0';
      add('0'); add('CIRCLE'); add('8'); add(layer);
      add('10'); add(x.toFixed(precision)); add('20'); add(y.toFixed(precision)); add('30'); add('0'); add('40'); add('1.0');
      if (connectLines && prev) {
        add('0'); add('LINE'); add('8'); add('0');
        add('10'); add(prev.x.toFixed(precision)); add('20'); add(prev.y.toFixed(precision)); add('30'); add('0');
        add('11'); add(x.toFixed(precision)); add('21'); add(y.toFixed(precision)); add('31'); add('0');
        if (distanceLabels) {
          const dist = Math.sqrt((x - prev.x) ** 2 + (y - prev.y) ** 2);
          add('0'); add('TEXT'); add('8'); add('0');
          add('10'); add(((x + prev.x) / 2).toFixed(precision)); add('20'); add(((y + prev.y) / 2).toFixed(precision)); add('30'); add('0'); add('40'); add('1.0'); add('1'); add(Math.round(dist) + 'm');
        }
      }
      add('0'); add('TEXT'); add('8'); add('0');
      add('10'); add(x.toFixed(precision)); add('20'); add((y + labelOffset).toFixed(precision)); add('30'); add('0'); add('40'); add('1.0'); add('1'); add(label);
      prev = { x, y };
    });
    add('0'); add('ENDSEC'); add('0'); add('EOF');
    return out.join('\r\n');
  }

  // ── Tải file (text/binary) ──────────────────────────────────────────────────
  function downloadText(filename, content, mime) {
    const blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    downloadBlob(filename, blob);
  }
  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none'; a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  // Tiện ích: xuất thẳng DXF ra file
  function exportDxf(points, filename, opts) {
    downloadText(filename || ('export-' + Date.now() + '.dxf'), buildDxf(points, opts), 'application/dxf');
  }

  CSGT.export = { latLonToVN2000, buildDxf, exportDxf, downloadText, downloadBlob };
})(typeof window !== 'undefined' ? window : globalThis);
