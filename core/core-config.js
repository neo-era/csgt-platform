/* =============================================================================
 * core-config.js — Cấu hình tập trung cho CSGT Platform
 * (gộp lighting-survey + dentat — Giai đoạn 1: chung hạ tầng, 2 module riêng)
 *
 * MỌI endpoint / token / tên sheet / repo đặt Ở ĐÂY, không hardcode rải rác.
 * Hai module khaosat/ và dentat/ đều nạp file này trước rồi đọc window.CSGT_CONFIG.
 *
 * Cập nhật lần cuối: 26/06/2026
 * ========================================================================== */

(function (global) {
  'use strict';

  // ── Spreadsheet "publish to web" base (đọc dữ liệu dạng CSV) ───────────────
  // d/e/<PUB_ID>/pub?gid=<gid>&single=true&output=csv
  const PUB = {
    // Spreadsheet KHẢO SÁT — Xã Cần Giuộc (dùng chung dữ liệu trụ/đèn)
    KHAOSAT_CANGIUOC: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzNnhFDaoZgyX-jqCUuVkq0NsdqasekQd53CoaI3racianUs--NgA1ZWjkz1wKRoFrhmUuOaO2_7xA',
    // Spreadsheet ĐÈN TẮT (dentat)
    DENTAT: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQC6mnGNSNDjUVzs5C4Se9Q9JQCGF9_YQRTRXewhsJhg0QDAcp6NqtxNsFl-fs8g1yyYBQEUqPhgwBv',
  };

  const csv = (base, gid) =>
    gid == null
      ? base + '/pub?output=csv'
      : base + '/pub?gid=' + gid + '&single=true&output=csv';

  // ── Google Apps Script Web App (GHI dữ liệu + upload ảnh) ──────────────────
  // LƯU Ý: mỗi lần sửa code GAS phải Deploy lại Web App và cập nhật URL ở đây.
  const GAS = {
    KHAOSAT: 'https://script.google.com/macros/s/AKfycbxPFn7lnJZYdjUg5WlVq1P1JGI5O3rvcry_IVE3bhF5foDmbgT6KwBU4xFxHNwKruHRvQ/exec',
    DENTAT:  'https://script.google.com/macros/s/AKfycbx0YAMrbBpNdTL0cmE_1LdQ7SJzeUW0J0VHhWpv3WqW9LvLyBTP8YV2nPzuuR27pJTZ8g/exec',
    // MỤC TIÊU Giai đoạn 1: hợp nhất về MỘT Web App, định tuyến theo `module`.
    // Khi đã gộp xong, đặt URL chung vào UNIFIED và bật USE_UNIFIED = true.
    UNIFIED: '',
    USE_UNIFIED: false,
  };

  // ── GitHub (lưu ảnh + file qua GAS proxy / Contents API) ───────────────────
  const GITHUB = {
    OWNER: 'neo-era',
    BRANCH: 'main',
    // Repo lưu ảnh hiện tại của từng module (giữ nguyên để không vỡ ảnh cũ).
    REPO_KHAOSAT: 'lighting-survey',
    REPO_DENTAT: 'dentat',
    rawBase: function (repo) {
      return 'https://raw.githubusercontent.com/' + GITHUB.OWNER + '/' + repo + '/' + GITHUB.BRANCH + '/';
    },
    // GITHUB_TOKEN (scope contents:write) lưu trong Script Properties của GAS,
    // KHÔNG để lộ ở client.
  };

  // ── Dịch vụ bản đồ / địa lý dùng chung ─────────────────────────────────────
  const SERVICES = {
    MAPILLARY_TOKEN: 'MLY|36684115377868575|f79dc382b6bbd9a0f9bdfe79c4eed78e',
    NOMINATIM: 'https://nominatim.openstreetmap.org/reverse',
    OSRM: 'https://router.project-osrm.org',
    TILES: {
      osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      googleMap: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      googleSat: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      googleHybrid: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      cartoLabels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    },
    GOOGLE_SUBDOMAINS: ['mt0', 'mt1', 'mt2', 'mt3'],
  };

  // ── VN2000 / CAD (transform tọa độ dùng chung cho cả 2 module) ─────────────
  const VN2000 = { k0: 0.9996, ellipsoid: 'WGS84' /* a=6378137; core-export dùng f=1/298.257222101 (GRS80) — sai khác sub-mm */ };

  // ── MODULE: KHẢO SÁT (lighting-survey) ─────────────────────────────────────
  const KHAOSAT = {
    id: 'khaosat',
    label: 'Khảo sát chiếu sáng',
    gas: GAS.KHAOSAT,
    githubRepo: GITHUB.REPO_KHAOSAT,
    sheetMain: 'DanhSachTru',
    authSheet: 'TaiKhoan',
    auditSheet: 'LichSu',
    idPrefix: { CanGiuoc: 'CG' },
    externalSpreadsheetIds: { CanGiuoc: '1u1KIDPX5INt-9bI6EDK-K6VKSCJAoey7drElKW3rLS0' },
    // Địa bàn: chỉ Xã Cần Giuộc (đã bỏ toàn bộ địa bàn TP.HCM)
    districts: [
      { label: 'Cần Giuộc', sheet: 'CanGiuoc', csvUrl: csv(PUB.KHAOSAT_CANGIUOC, 1149202043) },
    ],
    // Ánh xạ key JS -> tên cột thật trên Sheet (KHÔNG đổi tên cột Sheet đang chạy)
    fieldMap: {
      id: 'ID', tenTru: 'Tên trụ', lat: 'Lat', lon: 'Lon', ghiChu: 'Ghi chú',
      nguoiKS: 'Người KS', loai: 'Loại', tuDieuKhien: 'Tủ điều khiển',
      loaiTru: 'Loại trụ', loaiCan: 'Loại cần', loaiDen: 'Loại đèn',
      congSuat: 'Công suất', anh: 'Ảnh', thoiGian: 'Thời gian cập nhật',
      markerGoc: 'Marker gốc', khoangCach: 'Khoảng cách (m)', maPE: 'Mã PE',
      duong: 'Đường', phuongXa: 'Phường/ Xã', vn2000x: 'VN2000-X', vn2000y: 'VN2000-Y',
      soLuongDen: 'Số lượng đèn', loaiCap: 'Loại cáp', doChinhXac: 'Độ chính xác (m)',
      gpsMode: 'Chế độ GPS',
    },
  };

  // ── MODULE: ĐÈN TẮT (dentat) ───────────────────────────────────────────────
  const DENTAT = {
    id: 'dentat',
    label: 'Quản lý đèn tắt',
    gas: GAS.DENTAT,
    githubRepo: GITHUB.REPO_DENTAT,
    sheetMain: 'DanhSachDen',
    authSheet: 'TaiKhoan',
    csvUrl: csv(PUB.DENTAT),                 // tab DanhSachDen
    phuTrachCsvUrl: csv(PUB.DENTAT, 2043665350), // tab PhuTrach
    maxImgLen: 32767,
    // GIỮ NGUYÊN tên cột "lỗi" đang chạy thật: lontitude, Trang thai, HÌnh ảnh
    fieldMap: {
      id: 'ID', soTru: 'Số trụ', tenTu: 'Tên tủ', latitude: 'latitude',
      lontitude: 'lontitude', loaiDen: 'Loại đèn', congSuat: 'Công suất',
      trangThai: 'Trang thai', duong: 'Đường', phuong: 'Phường',
      ngayPhatHien: 'Ngày phát hiện', nguoiPhatHien: 'Người phát hiện',
      ngaySua: 'Ngày sửa', nguoiSua: 'Người sửa', vatTuSua: 'Vật tư sửa',
      hinhAnh: 'HÌnh ảnh', ghiChu: 'Ghi chú', vn2000x: 'VN2000-X',
      vn2000y: 'VN2000-Y', soDienThoai: 'Số điện thoại',
    },
    // Cấu hình trạng thái đèn (mã 1–7)
    statusConfig: {
      1: { label: 'LED hư',                color: '#ef4444', broken: true },
      2: { label: 'Sự cố',                 color: '#ec4899', broken: true },
      3: { label: 'LED bình thường',       color: '#10b981', broken: false },
      4: { label: 'HPS bình thường',       color: '#3b82f6', broken: false },
      5: { label: 'Hư > 10 ngày',          color: '#8b5cf6', broken: true },
      6: { label: 'Sự cố đã khắc phục',    color: '#0f766e', broken: false },
      7: { label: 'HPS hư',                color: '#f97316', broken: true },
    },
    quickFix: { 1: 3, 5: 3, 7: 4, 2: 6 },
  };

  // ── Theme / UI tokens dùng chung ───────────────────────────────────────────
  const THEME = {
    font: "'Inter', system-ui, sans-serif",
    radius: '14px',
    palette: {
      navy: '#0f172a', primary: '#2563eb', sky: '#0ea5e9',
      accent: '#f59e0b', success: '#10b981', danger: '#ef4444',
    },
    // Mỗi module có màu nhận diện riêng để phân biệt khi chuyển qua lại
    moduleColor: { khaosat: '#2563eb', dentat: '#0ea5e9' },
  };

  // ── PWA / version ──────────────────────────────────────────────────────────
  const APP = {
    name: 'CSGT Platform — Hệ thống Quản lý Chiếu sáng Công cộng',
    shortName: 'CSGT',
    swCacheVersion: 'csgt-v1',
    versionUrl: 'data/version.json',
  };

  // ── Xuất config ra global ──────────────────────────────────────────────────
  global.CSGT_CONFIG = {
    PUB, GAS, GITHUB, SERVICES, VN2000, THEME, APP,
    MODULES: { khaosat: KHAOSAT, dentat: DENTAT },
    // Tiện ích: chọn GAS theo module (tự chuyển sang UNIFIED khi đã gộp)
    gasFor: function (moduleId) {
      if (GAS.USE_UNIFIED && GAS.UNIFIED) return GAS.UNIFIED;
      return (global.CSGT_CONFIG.MODULES[moduleId] || {}).gas || '';
    },
    csv: csv,
  };

})(typeof window !== 'undefined' ? window : globalThis);
