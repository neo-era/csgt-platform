/* =============================================================================
 * core-image.js — Xử lý ảnh: nén/resize (tùy chọn watermark) + upload qua GAS
 * Hợp nhất resizeImageDataUrl (lighting-survey) và resizeImage có watermark
 * (dentat) + uploadImageViaGas.
 *
 * Phụ thuộc: window.CSGT.sync (postToGas). Trình duyệt (canvas, Image).
 * Xuất: window.CSGT.image
 * ========================================================================== */
(function (global) {
  'use strict';
  const CSGT = (global.CSGT = global.CSGT || {});

  function base64FromDataUrl(dataUrl) {
    return String(dataUrl).replace(/^data:image\/[^;]+;base64,/, '');
  }
  function extFromDataUrl(dataUrl) {
    const m = String(dataUrl).match(/^data:image\/(png|jpe?g|webp);base64,/i);
    if (!m) return 'jpg';
    const t = m[1].toLowerCase();
    return (t === 'jpeg' || t === 'jpg') ? 'jpg' : t;
  }

  // Nén/resize ảnh. opts:
  //   maxEdge (mặc định 800), maxLen (giới hạn độ dài chuỗi dataURL),
  //   quality (0..1, mặc định 0.85),
  //   watermark { soTru, tenTu, timestamp, lat, lon } — nếu có sẽ vẽ lên ảnh
  // callback(resultDataUrl, errorMessage)
  function resize(dataUrl, opts, callback) {
    if (typeof opts === 'function') { callback = opts; opts = {}; }
    opts = opts || {};
    const maxEdge = opts.maxEdge || 800;
    const maxLen = opts.maxLen || 32767;
    let q = opts.quality != null ? opts.quality : 0.85;
    const wm = opts.watermark || null;

    const img = new Image();
    img.onload = function () {
      let w = img.width, h = img.height;
      const sc = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.round(w * sc); h = Math.round(h * sc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      function render() {
        canvas.width = w; canvas.height = h;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        if (wm) {
          const lines = [];
          const label = [wm.soTru, wm.tenTu].filter(Boolean).join(' · ');
          if (label) lines.push('💡 ' + label);
          if (wm.timestamp) lines.push('⏱ ' + wm.timestamp);
          if (wm.lat && wm.lon) lines.push('📍 ' + Number(wm.lat).toFixed(6) + ', ' + Number(wm.lon).toFixed(6));
          if (lines.length) {
            const fs = Math.max(11, Math.round(w * 0.03));
            ctx.font = 'bold ' + fs + 'px monospace';
            const lh = fs + 5, px = 8, py = 5;
            const bh = lines.length * lh + py * 2;
            const bw = Math.max.apply(null, lines.map((l) => ctx.measureText(l).width)) + px * 2;
            const bx = w - bw - 6, by = h - bh - 6;
            ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#fff';
            lines.forEach((line, i) => ctx.fillText(line, bx + px, by + py + fs + i * lh));
          }
        }
        return canvas.toDataURL('image/jpeg', q);
      }
      let r = render();
      while (r.length > maxLen && q > 0.1) { q -= 0.08; r = render(); }
      while (r.length > maxLen && Math.max(w, h) > 100) { w = Math.round(w * 0.85); h = Math.round(h * 0.85); r = render(); }
      if (r.length > maxLen) { callback('', 'Ảnh quá lớn'); return; }
      callback(r);
    };
    img.onerror = function () { callback('', 'Không đọc được ảnh'); };
    img.src = dataUrl;
  }

  // Phiên bản Promise của resize
  function resizeAsync(dataUrl, opts) {
    return new Promise((resolve, reject) => {
      resize(dataUrl, opts, (res, err) => (err ? reject(new Error(err)) : resolve(res)));
    });
  }

  // Upload base64 ảnh lên GAS (action upload_image). GAS push lên GitHub, trả path/URL.
  // rawBase: tiền tố để ghép nếu GAS chỉ trả path tương đối (vd của dentat).
  async function uploadViaGas(gasUrl, dataUrl, soTru, opts = {}) {
    const data = await CSGT.sync.postToGas(gasUrl, {
      action: 'upload_image',
      imageBase64: base64FromDataUrl(dataUrl),
      ext: extFromDataUrl(dataUrl),
      soTru: soTru || 'img',
    }, { readResponse: true });
    if (data.status !== 'ok') throw new Error(data.message || 'Upload ảnh thất bại');
    const p = data.path || '';
    if (p.startsWith('http')) return p;
    const rawBase = opts.rawBase || '';
    return rawBase ? rawBase + p.replace(/^\//, '') : p;
  }

  CSGT.image = { base64FromDataUrl, extFromDataUrl, resize, resizeAsync, uploadViaGas };
})(typeof window !== 'undefined' ? window : globalThis);
