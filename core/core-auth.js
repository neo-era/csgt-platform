/* =============================================================================
 * core-auth.js — Đăng nhập + phân quyền dùng chung
 * Hợp nhất doLogin/canEdit/canDelete (lighting-survey) và
 * checkAuth/doLogin/isDemoUser (dentat). Đăng nhập qua GAS action 'login'.
 *
 * Phụ thuộc: window.CSGT.sync (postToGas)
 * Xuất: window.CSGT.auth
 *
 * user = { username, displayName, role, vung? }
 *   role: 'admin' | 'user' | 'user1' | 'demo'
 *   vung: mảng tên sheet được phép (rỗng/không có = toàn quyền địa bàn)
 * ========================================================================== */
(function (global) {
  'use strict';
  const CSGT = (global.CSGT = global.CSGT || {});
  if (!CSGT.sync) console.warn('[core-auth] cần core-sync.js nạp trước.');

  // ── Phiên đăng nhập (localStorage) ─────────────────────────────────────────
  // Mỗi module dùng key riêng để không đụng nhau: 'ks_user' (khảo sát), 'dt_user' (đèn tắt)
  function loadSession(storageKey) {
    try { const u = JSON.parse(localStorage.getItem(storageKey) || 'null'); return (u && u.username) ? u : null; }
    catch (e) { return null; }
  }
  function saveSession(storageKey, user) { localStorage.setItem(storageKey, JSON.stringify(user)); }
  function clearSession(storageKey) { localStorage.removeItem(storageKey); }

  // ── Đăng nhập qua GAS ──────────────────────────────────────────────────────
  // @return user object (ném lỗi nếu sai hoặc kết nối lỗi)
  async function login(gasUrl, username, password, opts = {}) {
    username = (username || '').trim();
    if (!username) throw new Error('Vui lòng nhập tên đăng nhập');
    if (!password) throw new Error('Vui lòng nhập mật khẩu');
    const data = await CSGT.sync.postToGas(gasUrl,
      { action: 'login', username, password },
      Object.assign({ readResponse: true, timeout: 25000 }, opts));
    if (data.status !== 'ok') throw new Error(data.message || 'Sai tên đăng nhập hoặc mật khẩu');
    return data.user;
  }

  // ── Phân quyền ─────────────────────────────────────────────────────────────
  function roleOf(user) { return (user && user.role) || ''; }
  function isDemo(user)   { return roleOf(user) === 'demo'; }
  function isAdmin(user)  { return roleOf(user) === 'admin'; }
  function canEdit(user)  { const r = roleOf(user); return r === 'admin' || r === 'user' || r === 'user1'; }
  function canDelete(user){ const r = roleOf(user); return r === 'admin' || r === 'user'; }

  // Lọc danh sách địa bàn theo vung của user (rỗng = tất cả)
  function allowedDistricts(user, allDistricts) {
    const vung = user && user.vung;
    if (!vung || !vung.length) return allDistricts;
    return allDistricts.filter((d) => vung.includes(d.sheet));
  }

  // Nhãn vai trò hiển thị
  const ROLE_LABELS = { admin: 'Quản trị', user: 'Đầy đủ', user1: 'Khảo sát viên', demo: 'Chỉ xem' };
  function roleLabel(user) { return ROLE_LABELS[roleOf(user)] || roleOf(user); }

  CSGT.auth = {
    loadSession, saveSession, clearSession,
    login,
    roleOf, isDemo, isAdmin, canEdit, canDelete,
    allowedDistricts, roleLabel, ROLE_LABELS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
