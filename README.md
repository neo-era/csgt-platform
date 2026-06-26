# CSGT Platform

Hệ thống Quản lý Chiếu sáng Công cộng — CSCC TP.HCM.
Repo gộp của hai dự án `lighting-survey` (Khảo sát) và `dentat` (Đèn tắt).

**Phương án:** chung hạ tầng (repo + GAS + spreadsheet + core code), **2 module riêng**.

## Cấu trúc

```
csgt-platform/
├── index.html          # Trang chọn module (landing)
├── manifest.json       # PWA chung
├── sw.js               # Service Worker chung
├── core/               # ⭐ Thư viện lõi dùng chung (window.CSGT)
│   ├── core-config.js  # endpoint, sheet, repo, theme, fieldMap
│   ├── core-sync.js    # đọc CSV + ghi GAS
│   ├── core-auth.js    # đăng nhập + phân quyền
│   ├── core-map.js     # khởi tạo Leaflet + cluster
│   ├── core-image.js   # nén ảnh + upload GAS
│   ├── core-geo.js     # reverse geocode + định tuyến
│   └── core-export.js  # VN2000 + DXF + tải file
├── khaosat/            # Module Khảo sát (sẽ chuyển từ lighting-survey)
│   └── index.html      # stub — kiểm tra config
├── dentat/             # Module Đèn tắt (sẽ chuyển từ dentat)
│   └── index.html      # stub — kiểm tra config
├── data/
│   └── version.json    # version dữ liệu (auto-bump bởi CI)
└── .github/workflows/bump-version.yml
```

## core-config.js

Mọi endpoint/token/tên sheet/repo nằm **một chỗ** trong `core/core-config.js`, đọc qua
`window.CSGT_CONFIG`. Ví dụ:

```js
window.CSGT_CONFIG.gasFor('khaosat');          // URL GAS của module khảo sát
window.CSGT_CONFIG.MODULES.dentat.fieldMap;    // ánh xạ cột của module đèn tắt
window.CSGT_CONFIG.MODULES.khaosat.districts;  // danh sách 15 địa bàn + CSV
```

Khi đã hợp nhất hai GAS thành một Web App: điền `GAS.UNIFIED` và đặt
`GAS.USE_UNIFIED = true` — `gasFor()` tự chuyển sang URL chung.

## Trạng thái

**Giai đoạn 1 (chung hạ tầng) + Giai đoạn 2 (tách core + chuyển UI 2 module) — đã xong.**
6 module core đã tách và test. **Cả hai module đã chuyển UI đầy đủ sang dùng core**:

- `dentat/index.html` — toàn bộ app đèn tắt, nạp core, config từ `CSGT_CONFIG`.
- `khaosat/index.html` — toàn bộ app khảo sát, nạp core, config + 15 địa bàn từ `CSGT_CONFIG`.

Mỗi module giữ nguyên logic nghiệp vụ riêng; phần dùng chung (VN2000, CSV, upload ảnh…)
gọi sang `window.CSGT.*`. Xem `docs/MIGRATION.md` để biết ánh xạ hàm cũ → core.

Việc còn lại: deploy backend 