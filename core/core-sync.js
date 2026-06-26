/* =============================================================================
 * core-sync.js — Đọc CSV (Google Sheets) + Ghi qua GAS Web App
 * Hợp nhất từ lighting-survey (parseCSVText, syncRowToGAS) và
 * dentat (parseCsvRows/parseCsvToObjects, fetch no-cors).
 *
 * Phụ thuộc: không. (Tùy chọn đọc window.CSGT_CONFIG)
 * Xuất: window.CSGT.sync
 * ========================================================================== */
(function (global) {
  'use strict';
  const CSGT = (global.CSGT = global.CSGT || {});

  // ── CSV PARSER (bản mạnh của dentat — xử lý "" escape + xuống dòng trong ô) ──
  function parseCsvRows(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const s = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQuotes) {
        if (c === '"') {
          if (s[i + 1] === '"') { field += '"'; i++; } // "" → 1 dấu "
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function parseCsvToObjects(text) {
    const rows = parseCsvRows(text);
    if (!rows.length) return [];
    const headers = rows[0].map((h) => String(h).trim());
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i], obj = {};
      headers.forEach((h, j) => { if (h) obj[h] = r[j] !== undefined ? r[j] : ''; });
      out.push(obj);
    }
    return out;
  }

  // ── ĐỌC dữ liệu từ Google Sheets CSV (cache-busting) ───────────────────────
  async function fetchCsv(csvUrl, { bust = true } = {}) {
    const url = bust ? csvUrl + (csvUrl.includes('?') ? '&' : '?') + 't=' + Date.now() : csvUrl;
    const res = await fetch(url);
    if (!res.ok) throw new Error('CSV HTTP ' + res.status);
    return res.text();
  }
  async function fetchRows(csvUrl, opts)   { return parseCsvRows(await fetchCsv(csvUrl, opts)); }
  async function fetchObjects(csvUrl, opts){ return parseCsvToObjects(await fetchCsv(csvUrl, opts)); }

  // ── GHI qua GAS Web App ────────────────────────────────────────────────────
  // Hai dự án deploy GAS khác nhau:
  //   - lighting-survey: CORS bật → đọc được response JSON.
  //   - dentat: dùng no-cors → KHÔNG đọc được response (fire-and-forget).
  // postToGas tự xử lý cả hai qua tham số readResponse.
  //
  // @param url        URL GAS Web App
  // @param payload    object — phải có 'action' (login | full_update | delete_row | upload_image | ...)
  // @param opts       { readResponse=true, timeout=25000, signal }
  // @return           readResponse=true → JSON đã parse; false → { status:'sent' }
  async function postToGas(url, payload, opts = {}) {
    const { readResponse = true, timeout = 25000, signal } = opts;
    if (!url) throw new Error('Chưa cấu hình GAS URL.');

    if (!readResponse) {
      // Fire-and-forget (no-cors) — dùng khi GAS chưa bật CORS
      await fetch(url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      return { status: 'sent' };
    }

    const ctrl = signal ? null : new AbortController();
    const tid = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: signal || (ctrl && ctrl.signal),
      });
      if (tid) clearTimeout(tid);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const txt = await res.text();
      try { return JSON.parse(txt); }
      catch (e) { throw new Error('GAS trả về không phải JSON: ' + txt.slice(0, 200)); }
    } catch (e) {
      if (tid) clearTimeout(tid);
      throw e;
    }
  }

  // Tiện ích cao cấp: ghi/sửa 1 bản ghi (payload camelCase, GAS tự map qua FIELD_MAP)
  function fullUpdate(url, fields, opts) {
    return postToGas(url, Object.assign({ action: 'full_update' }, fields), opts);
  }
  function deleteRow(url, fields, opts) {
    return postToGas(url, Object.assign({ action: 'delete_row' }, fields), opts);
  }

  CSGT.sync = {
    parseCsvRows, parseCsvToObjects,
    fetchCsv, fetchRows, fetchObjects,
    postToGas, fullUpdate, deleteRow,
  };
})(typeof window !== 'undefined' ? window : globalThis);
