/* =============================================================================
 * gas-unified.js — Google Apps Script HỢP NHẤT cho CSGT Platform
 * Một Web App phục vụ cả 2 module: 'khaosat' (lighting-survey) + 'dentat'.
 * Client gửi kèm field `module` trong mọi request; router chọn cấu hình tương ứng.
 *
 * GỘP TỪ: gas-khaosat.js + gas.js (giữ nguyên logic thật của cả hai).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CÀI ĐẶT (làm 1 lần):
 *  1. Tạo project Apps Script mới (script.google.com) → dán toàn bộ file này.
 *  2. Điền SPREADSHEET_IDS bên dưới (ID Spreadsheet của từng module —
 *     lấy từ URL Google Sheet: .../spreadsheets/d/<ID>/edit).
 *  3. Project Settings → Script Properties → thêm GITHUB_TOKEN (PAT scope contents:write).
 *     (Tùy chọn) thêm AUTH_PEPPER = chuỗi bí mật để tăng độ mạnh hash mật khẩu.
 *     ⚠️ Đặt AUTH_PEPPER TRƯỚC khi đăng nhập/migrate — đổi sau sẽ làm sai mọi hash cũ.
 *  3b. Mật khẩu TaiKhoan lưu dạng hash SHA-256. Chạy hàm migratePasswordsToHash()
 *      một lần trong editor để hash các mật khẩu plaintext sẵn có (đăng nhập đúng
 *      cũng tự nâng cấp từng tài khoản sang hash).
 *  3c. 2 module DÙNG CHUNG 1 Spreadsheet → SPREADSHEET_IDS.khaosat = .dentat = cùng ID.
 *  4. Deploy → New deployment → type "Web app":
 *        Execute as: Me
 *        Who has access: Anyone   ← bắt buộc để client đọc được JSON (CORS)
 *  5. Copy URL /exec → dán vào core-config.js:  GAS.UNIFIED = '<url>'; GAS.USE_UNIFIED = true;
 *     Trong client đặt readResponse: true cho cả 2 module (bỏ no-cors).
 *
 * GHI CHÚ CORS: request dùng Content-Type 'text/plain' (core-sync.js đã làm vậy) là
 * "simple request" → không có preflight → response /exec đọc được cross-origin.
 * ========================================================================== */

// ── ID Spreadsheet của từng module (BẮT BUỘC điền) ──────────────────────────
// 2 module DÙNG CHUNG 1 Spreadsheet (cùng dữ liệu trụ/đèn — Xã Cần Giuộc).
const SHARED_SPREADSHEET_ID = '1u1KIDPX5INt-9bI6EDK-K6VKSCJAoey7drElKW3rLS0';
const SPREADSHEET_IDS = {
  khaosat: SHARED_SPREADSHEET_ID,   // chứa DanhSachTru + TaiKhoan + LichSu
  dentat:  SHARED_SPREADSHEET_ID,   // chứa DanhSachDen (+ PhuTrach) — cùng file
};

// ── Sheet ở FILE NGOÀI (mở bằng openById theo tên tab) ──────────────────────
const EXTERNAL_SPREADSHEET_IDS = {
  khaosat: {
    CanGiuoc: '1u1KIDPX5INt-9bI6EDK-K6VKSCJAoey7drElKW3rLS0',
  },
  dentat: {},
};

// ── Cấu hình từng module ────────────────────────────────────────────────────
const MODULES = {
  khaosat: {
    sheetMain: 'DanhSachTru',
    usersSheet: 'TaiKhoan',
    auditSheet: 'LichSu',                 // ghi log thao tác (action log_action)
    githubRepo: 'neo-era/lighting-survey',
    dateTextCols: [],
    search: { idHeader: 'ID', nameHeader: 'Tên trụ', idKey: 'id', nameKey: 'tenTru', oldNameKey: 'oldTenTru' },
    fieldMap: {
      id:'ID', tenTru:'Tên trụ', lat:'Lat', lon:'Lon', ghiChu:'Ghi chú', nguoiKS:'Người KS',
      loai:'Loại', tuDieuKhien:'Tủ điều khiển', loaiTru:'Loại trụ', loaiCan:'Loại cần',
      loaiDen:'Loại đèn', congSuat:'Công suất', hinhAnh:'Ảnh', capNhat:'Thời gian cập nhật',
      markerGoc:'Marker gốc', khoangCach:'Khoảng cách (m)', maPE:'Mã PE', duong:'Đường',
      phuongXa:'Phường/ Xã', vn2000x:'VN2000-X', vn2000y:'VN2000-Y', soLuongDen:'Số lượng đèn',
      loaiCap:'Loại cáp', accuracy:'Độ chính xác (m)', gpsMode:'Chế độ GPS',
    },
  },
  dentat: {
    sheetMain: 'DanhSachDen',
    usersSheet: 'TaiKhoan',
    auditSheet: null,
    githubRepo: 'neo-era/dentat',
    dateTextCols: ['Ngày phát hiện', 'Ngày sửa'],   // ép TEXT để Sheets không đảo ngày/tháng
    search: { idHeader: 'ID', nameHeader: 'Số trụ', idKey: 'id', nameKey: 'soTru', oldNameKey: null },
    fieldMap: {
      id:'ID', soTru:'Số trụ', tenTu:'Tên tủ', lat:'latitude', latitude:'latitude',
      lon:'lontitude', longitude:'lontitude', lontitude:'lontitude', loaiDen:'Loại đèn',
      congSuat:'Công suất', trangThai:'Trang thai', duong:'Đường', phuong:'Phường',
      ngayPhatHien:'Ngày phát hiện', nguoiPhatHien:'Người phát hiện', ngaySua:'Ngày sửa',
      nguoiSua:'Người sửa', vatTuSua:'Vật tư sửa', hinhAnh:'HÌnh ảnh', ghiChu:'Ghi chú',
      vn2000x:'VN2000-X', vn2000y:'VN2000-Y', dienThoai:'Số điện thoại',
    },
  },
};

// ── ROUTER ──────────────────────────────────────────────────────────────────
function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'CSGT unified GAS — sẵn sàng (khaosat + dentat)' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const moduleId = (data.module || '').trim();
    const cfg = MODULES[moduleId];
    if (!cfg) return jsonResponse({ status: 'error', message: 'Thiếu hoặc sai "module": ' + moduleId });

    switch (data.action) {
      case 'login':
        return handleLogin(cfg, moduleId, (data.username || '').trim(), data.password || '');

      case 'upload_image':
        return handleImageUpload(cfg, data.imageBase64 || '', data.soTru || '', data.ext || 'jpg');

      case 'github_write_file':
      case 'upload_to_github':
        return handleGithubWriteFile(cfg, data.path || '', data.content || '', data.sha || '', data.message || 'Cập nhật file');

      case 'log_action':
        return handleLogAction(cfg, moduleId, data);

      case 'full_update': {
        const sheet = getSheet(moduleId, data.sheet);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const hIdx = buildHeaderIndex(headers);
        const rowNum = findRowNum(cfg, sheet, headers, hIdx, data);
        if (rowNum > 0) updateRow(cfg, sheet, hIdx, rowNum, data);
        else appendRow(cfg, sheet, headers, hIdx, data);
        return jsonResponse({ status: 'ok' });
      }

      case 'delete_row': {
        const sheet = getSheet(moduleId, data.sheet);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const hIdx = buildHeaderIndex(headers);
        const rowNum = findRowNum(cfg, sheet, headers, hIdx, data);
        if (rowNum > 0) { sheet.deleteRow(rowNum); return jsonResponse({ status: 'ok' }); }
        return jsonResponse({ status: 'error', message: 'Không tìm thấy hàng để xóa.' });
      }

      default:
        return jsonResponse({ status: 'error', message: 'action không hợp lệ: ' + data.action });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ── SPREADSHEET / SHEET ─────────────────────────────────────────────────────
function openSpreadsheet(moduleId, sheetName) {
  // Ưu tiên file ngoài theo tên tab (vd Cần Giuộc của khảo sát)
  const ext = (EXTERNAL_SPREADSHEET_IDS[moduleId] || {})[sheetName];
  if (ext) {
    try { return SpreadsheetApp.openById(ext); } catch (e) { Logger.log('openById ext fail: ' + e.message); }
  }
  const id = SPREADSHEET_IDS[moduleId];
  if (id && id.indexOf('PASTE_') !== 0) {
    return SpreadsheetApp.openById(id);
  }
  // Fallback: script bound vào 1 spreadsheet
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(moduleId, sheetName) {
  const cfg = MODULES[moduleId];
  const target = sheetName || cfg.sheetMain;
  const ss = openSpreadsheet(moduleId, target);
  let sheet = ss.getSheetByName(target);
  if (!sheet) {
    // fallback về sheet chính ở spreadsheet chính của module
    const main = openSpreadsheet(moduleId, cfg.sheetMain);
    sheet = main.getSheetByName(cfg.sheetMain) || main.insertSheet(cfg.sheetMain);
  }
  return sheet;
}

function getUsersSheet(moduleId) {
  const cfg = MODULES[moduleId];
  const ss = openSpreadsheet(moduleId, cfg.usersSheet);
  return ss.getSheetByName(cfg.usersSheet);
}

// ── LOGIN (đọc TaiKhoan theo header — hỗ trợ cả 2 layout) ────────────────────
function handleLogin(cfg, moduleId, username, password) {
  const sheet = getUsersSheet(moduleId);
  if (!sheet) return jsonResponse({ status: 'error', message: 'Sheet "TaiKhoan" chưa được tạo.' });
  const all = sheet.getDataRange().getValues();
  if (all.length < 2) return jsonResponse({ status: 'error', message: 'Chưa có tài khoản nào trong TaiKhoan.' });

  const headers = all[0].map(function (h) { return norm(String(h)); });
  const cU = headers.indexOf(norm('tenDangNhap'));
  const cP = headers.indexOf(norm('matKhau'));
  const cN = headers.indexOf(norm('hoTen'));
  const cR = headers.indexOf(norm('vaiTro'));
  const cV = headers.indexOf(norm('vung'));   // chỉ khảo sát có
  if (cU === -1 || cP === -1) return jsonResponse({ status: 'error', message: 'TaiKhoan thiếu cột tenDangNhap/matKhau.' });

  const uNorm = norm(username);
  for (let i = 1; i < all.length; i++) {
    const row = all[i];
    if (norm(String(row[cU] || '')) !== uNorm) continue;

    const stored = String(row[cP] || '');
    let ok;
    if (looksHashed(stored)) {
      ok = hashPassword(password) === stored.toLowerCase();
    } else {
      ok = stored === String(password);   // tài khoản plaintext cũ
      // Auto-upgrade: đăng nhập đúng → thay plaintext bằng hash ngay (row sheet = i+1, cột = cP+1)
      if (ok && stored) {
        try { sheet.getRange(i + 1, cP + 1).setValue(hashPassword(password)); }
        catch (e) { Logger.log('auto-upgrade hash fail: ' + e.message); }
      }
    }
    if (!ok) continue;

    const vungRaw = cV >= 0 ? String(row[cV] || '').trim() : '';
    const vung = vungRaw ? vungRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    return jsonResponse({
      status: 'ok',
      user: {
        username:    String(row[cU]).trim(),
        displayName: cN >= 0 ? (String(row[cN] || '').trim() || username) : username,
        role:        cR >= 0 ? norm(String(row[cR] || '')) : 'user',
        vung:        vung,
      },
    });
  }
  return jsonResponse({ status: 'error', message: 'Sai tên đăng nhập hoặc mật khẩu.' });
}

// ── MIGRATE: hash toàn bộ mật khẩu plaintext trong TaiKhoan (chạy 1 lần) ─────
// Cách dùng: đặt AUTH_PEPPER (nếu muốn) → mở Apps Script editor → chọn hàm này
// → Run. Chạy lại nhiều lần vô hại (bỏ qua giá trị đã là hash).
function migratePasswordsToHash() {
  const report = [];
  Object.keys(MODULES).forEach(function (moduleId) {
    const sheet = getUsersSheet(moduleId);
    if (!sheet) { report.push(moduleId + ': không có sheet TaiKhoan'); return; }
    const all = sheet.getDataRange().getValues();
    if (all.length < 2) { report.push(moduleId + ': trống'); return; }
    const headers = all[0].map(function (h) { return norm(String(h)); });
    const cP = headers.indexOf(norm('matKhau'));
    if (cP === -1) { report.push(moduleId + ': thiếu cột matKhau'); return; }

    let changed = 0;
    for (let i = 1; i < all.length; i++) {
      const stored = String(all[i][cP] || '');
      if (stored && !looksHashed(stored)) {
        sheet.getRange(i + 1, cP + 1).setValue(hashPassword(stored));
        changed++;
      }
    }
    report.push(moduleId + ': đã hash ' + changed + '/' + (all.length - 1) + ' tài khoản');
  });
  Logger.log(report.join('\n'));
  return report;
}

// ── GHI / SỬA / XÓA ─────────────────────────────────────────────────────────
function findRowNum(cfg, sheet, headers, hIdx, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const s = cfg.search;
  const idCol   = hIdx[norm(s.idHeader)];
  const nameCol = hIdx[norm(s.nameHeader)];
  const searchId   = norm(data[s.idKey] || data[s.idHeader] || '');
  const searchName = norm((s.oldNameKey && data[s.oldNameKey]) || data[s.nameKey] || data[s.nameHeader] || '');
  if (!searchId && !searchName) return -1;

  const allData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (let i = 0; i < allData.length; i++) {
    const rowId   = idCol   !== undefined ? norm(allData[i][idCol])   : '';
    const rowName = nameCol !== undefined ? norm(allData[i][nameCol]) : '';
    // Có ID → chỉ khớp ID (tránh ghi chồng). Không ID → fallback theo tên/số trụ.
    const matched = searchId ? (rowId && rowId === searchId) : (rowName && rowName === searchName);
    if (matched) return i + 2;
  }
  return -1;
}

function updateRow(cfg, sheet, hIdx, rowNum, data) {
  updateRowFields(cfg, sheet, hIdx, rowNum, buildFieldValues(cfg, data));
}

function updateRowFields(cfg, sheet, hIdx, rowNum, fieldValues) {
  const dateCols = cfg.dateTextCols || [];
  for (const header in fieldValues) {
    const col = hIdx[norm(header)];
    if (col === undefined) continue;
    const value = fieldValues[header];
    const cell = sheet.getRange(rowNum, col + 1);
    if (value === '' || value === null || value === undefined) {
      cell.clearContent();
    } else {
      if (dateCols.indexOf(header) !== -1) cell.setNumberFormat('@');
      cell.setValue(value);
    }
  }
}

function appendRow(cfg, sheet, headers, hIdx, data) {
  const fieldValues = buildFieldValues(cfg, data);
  const rowNum = sheet.getLastRow() + 1;
  // Ép TEXT cho cột ngày TRƯỚC khi ghi
  (cfg.dateTextCols || []).forEach(function (header) {
    const col = hIdx[norm(header)];
    if (col !== undefined) sheet.getRange(rowNum, col + 1).setNumberFormat('@');
  });
  const row = headers.map(function (h) { return fieldValues[h] !== undefined ? fieldValues[h] : ''; });
  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
}

function buildFieldValues(cfg, data) {
  const result = {};
  const skip = { action: 1, sheet: 1, module: 1, oldTenTru: 1 };
  for (const key in data) {
    if (skip[key]) continue;
    const header = cfg.fieldMap[key] || key;
    const v = data[key];
    if (v !== undefined && v !== null) result[header] = v; // giữ '' để xóa ô
  }
  return result;
}

// ── ẢNH → GITHUB ────────────────────────────────────────────────────────────
function handleImageUpload(cfg, imageBase64, soTru, ext) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) return jsonResponse({ status: 'error', message: 'GITHUB_TOKEN chưa cài trong Script Properties.' });

  const ts = Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd'T'HH-mm-ss") + 'Z';
  const safeName = (soTru || 'img').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const fileName = safeName + '-' + ts + '.' + (ext || 'jpg');
  const filePath = 'images/' + fileName;
  const apiUrl = 'https://api.github.com/repos/' + cfg.githubRepo + '/contents/'
    + filePath.split('/').map(encodeURIComponent).join('/');

  const res = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
    payload: JSON.stringify({ message: 'Upload ảnh: ' + fileName, content: imageBase64, branch: 'main' }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    return jsonResponse({ status: 'error', message: 'GitHub API lỗi ' + code + ': ' + res.getContentText().slice(0, 300) });
  }
  const url = 'https://raw.githubusercontent.com/' + cfg.githubRepo + '/main/images/' + fileName;
  return jsonResponse({ status: 'ok', path: url });
}

// ── GHI FILE BẤT KỲ → GITHUB (Excel/DXF…) ───────────────────────────────────
function handleGithubWriteFile(cfg, filePath, content, sha, message) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) return jsonResponse({ status: 'error', message: 'GITHUB_TOKEN chưa cài.' });
  const apiUrl = 'https://api.github.com/repos/' + cfg.githubRepo + '/contents/'
    + filePath.split('/').map(encodeURIComponent).join('/');
  const body = { message: message || 'Update file', content: content, branch: 'main' };
  if (sha) body.sha = sha;
  const res = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    return jsonResponse({ status: 'error', message: 'GitHub API lỗi ' + code + ': ' + res.getContentText().slice(0, 300) });
  }
  return jsonResponse({ status: 'ok' });
}

// ── AUDIT LOG (chỉ module có auditSheet, vd khảo sát → LichSu) ───────────────
function handleLogAction(cfg, moduleId, data) {
  if (!cfg.auditSheet) return jsonResponse({ status: 'ok', skipped: 'no audit sheet' });
  const ss = openSpreadsheet(moduleId, cfg.auditSheet);
  let sheet = ss.getSheetByName(cfg.auditSheet);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.auditSheet);
    sheet.appendRow(['Thời gian', 'Người thực hiện', 'Thao tác', 'ID', 'Tên trụ', 'Chi tiết']);
  }
  sheet.appendRow([
    new Date(),
    data.nguoiThucHien || data.user || '',
    data.thaoTac || data.op || '',
    data.id || '',
    data.tenTru || data.soTru || '',
    data.chiTiet || data.detail || '',
  ]);
  return jsonResponse({ status: 'ok' });
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
// Hash mật khẩu: SHA-256(password + pepper) → hex 64 ký tự.
// Pepper (tùy chọn) lấy từ Script Property 'AUTH_PEPPER' — PHẢI đặt TRƯỚC khi
// hash/migrate, đổi pepper sau sẽ làm sai toàn bộ hash cũ.
function hashPassword(plain) {
  const pepper = PropertiesService.getScriptProperties().getProperty('AUTH_PEPPER') || '';
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(plain) + pepper, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
// Giá trị lưu trong cột matKhau trông giống hash SHA-256 (64 hex)?
function looksHashed(s) {
  return /^[0-9a-f]{64}$/i.test(String(s || ''));
}

function norm(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}
function buildHeaderIndex(headers) {
  const idx = {};
  for (let i = 0; i < headers.length; i++) idx[norm(headers[i])] = i;
  return idx;
}
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
