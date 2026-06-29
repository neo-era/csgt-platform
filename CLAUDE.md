# CLAUDE.md — CSGT Platform (Xã Cần Giuộc)

Hướng dẫn cho Claude Code (và lập trình viên) khi làm việc trong repo này.

---

## 1. Dự án là gì

**CSGT Platform** — *Hệ thống Quản lý Chiếu sáng Công cộng* của **Xã Cần Giuộc**.
Repo gộp của hai web app cùng tác giả (Mai Vũ Lâm), cùng hạ tầng, **giữ 2 module riêng**:

| Module | Thư mục | Vai trò | Nguồn gốc |
|---|---|---|---|
| **Khảo sát** | `khaosat/` | Kiểm kê trụ–tủ–đèn trên bản đồ, GPS/RTK, xuất CAD VN2000, bản vẽ | `lighting-survey` cũ |
| **Đèn tắt** | `dentat/` | Theo dõi đèn hư/tắt, biên bản sự cố, phối hợp đơn vị quản lý hạ tầng, kênh người dân | `dentat` cũ |

Hai module là **hai nửa của một vòng đời**: khảo sát *sinh ra* dữ liệu trụ → đèn tắt *theo dõi sự cố* trên cùng cây trụ đó.

Tài liệu liên quan: `docs/KE-HOACH-GOP-DU-AN.md` (lộ trình gộp), `docs/MIGRATION.md` (ánh xạ hàm cũ → core).

---

## 2. Kiến trúc (serverless, không build step)

```
Trình duyệt (PWA, vanilla JS)
   │  đọc:  CSV published-to-web  ──────────────►  Google Sheets (DB)
   │  ghi:  POST JSON  ───►  Google Apps Script (Web App)  ───► Google Sheets
   │  ảnh:  base64 ───► GAS ───► GitHub Contents API ───► repo ảnh (raw.githubusercontent)
   └─ host: GitHub Pages (tĩnh)
```

- **Không framework, không bundler.** Mỗi module là 1 file HTML lớn chứa UI + CSS + JS inline, nạp thêm thư viện `core/*.js`.
- **Đọc/ghi tách rời:** đọc trực tiếp CSV (nhanh, không tốn quota GAS); ghi/sửa/xóa/login/upload qua GAS Web App.
- **PWA:** `manifest.json` + `sw.js` chung ở gốc (network-first cho app, cache-first cho map tiles & CDN libs, **không cache** `docs.google.com`/`script.google.com`).

---

## 3. Cấu trúc thư mục

```
csgt-platform/
├── CLAUDE.md               # tài liệu này
├── README.md
├── index.html              # landing chọn module
├── manifest.json, sw.js    # PWA chung
├── core/                   # ⭐ thư viện lõi dùng chung → window.CSGT
│   ├── core-config.js      # endpoint/sheet/repo/theme/fieldMap (window.CSGT_CONFIG)
│   ├── core-sync.js        # CSV parse + fetch + postToGas
│   ├── core-auth.js        # login + phân quyền
│   ├── core-map.js         # khởi tạo Leaflet + cluster
│   ├── core-image.js       # nén ảnh + upload GAS
│   ├── core-geo.js         # reverse geocode + định tuyến
│   └── core-export.js      # VN2000 + DXF + tải file
├── khaosat/                # module Khảo sát (index.html + huongdan/lichsu/banve-mau + images/)
├── dentat/                 # module Đèn tắt (index.html + huongdan/quytrinh/bcsc + images/)
├── data/                   # version.json + icon PWA
├── docs/                   # KE-HOACH-GOP-DU-AN.md, MIGRATION.md
└── .github/workflows/bump-version.yml
```

---

## 4. Thư viện core — `window.CSGT`

Nạp theo thứ tự: **config → sync → (auth/map/image/geo/export)**. Tất cả expose qua `window.CSGT`, cấu hình qua `window.CSGT_CONFIG`.

### core-config.js → `window.CSGT_CONFIG`
- `MODULES.khaosat` / `MODULES.dentat`: `{ gas, sheetMain, githubRepo, fieldMap, districts|csvUrl, ... }`
- `gasFor(moduleId)` → URL GAS (tự chuyển sang `GAS.UNIFIED` khi `GAS.USE_UNIFIED=true`)
- `GITHUB.rawBase(repo)`, `SERVICES.MAPILLARY_TOKEN`, `csv(base, gid)`

### core-sync.js → `CSGT.sync`
- `parseCsvRows(text)` / `parseCsvToObjects(text)` — parser CSV mạnh (xử lý `""` escape + xuống dòng trong ô)
- `fetchRows(url)` / `fetchObjects(url)` — đọc CSV từ Sheet (cache-busting)
- `postToGas(url, payload, {readResponse, timeout})` — ghi qua GAS
  - `readResponse:true` → đọc JSON (GAS bật CORS); `false` → fire-and-forget (no-cors)
- `fullUpdate(url, fields, opts)`, `deleteRow(url, fields, opts)`

### core-auth.js → `CSGT.auth`
- `login(gasUrl, user, pass)` → user object (ném lỗi nếu sai)
- `loadSession/saveSession/clearSession(key)` — key: `ks_user` (khảo sát), `dt_user` (đèn tắt)
- `canEdit(u)`, `canDelete(u)`, `isDemo(u)`, `isAdmin(u)`, `allowedDistricts(u, list)`

### core-map.js → `CSGT.map`
- `createMap(elId, {center, zoom, maxZoom, mobile})` → `{ map, cluster, labelLayer, layers }`
- `makeLabel(latlng, text)` — divIcon nhãn số trụ

### core-image.js → `CSGT.image`
- `resize(dataUrl, {maxEdge, maxLen, quality, watermark}, cb)` / `resizeAsync`
- `uploadViaGas(gasUrl, dataUrl, soTru, {rawBase})` — base64 → GAS → GitHub
- `base64FromDataUrl`, `extFromDataUrl`

### core-geo.js → `CSGT.geo`
- `reverseGeocode(lat, lon)` → address (Nominatim) · `roadFromAddress(a)`
- `route(origin, dest)` (OSRM) · `drawRoute(map, route)`

### core-export.js → `CSGT.export`
- `latLonToVN2000(lat, lon)` → `{x, y, zone}` (TM, WGS84, k0=0.9996, false E=500000)
- `buildDxf(points, {connectLines, distanceLabels})` / `exportDxf(points, file, opts)`
- `downloadText(name, content, mime)` / `downloadBlob`

> Khi sửa logic dùng chung, sửa trong `core/` để **một nguồn duy nhất**; cả hai module hưởng theo.

---

## 5. Data model — Google Sheets

**Cả 2 module DÙNG CHUNG 1 Spreadsheet** — Xã Cần Giuộc (doc id `1u1KIDPX5INt...` để GHI qua GAS; bản publish `2PACX-1vRzNnh...` = `PUB.CANGIUOC` để ĐỌC CSV). **Tuyệt đối không đổi tên cột Sheet đang chạy** — chỉ ánh xạ qua `fieldMap` trong `core-config.js`.

### Khảo sát — tab `CanGiuoc` (gid 1149202043)
25 cột: `ID, Tên trụ, Lat, Lon, Ghi chú, Người KS, Loại, Tủ điều khiển, Loại trụ, Loại cần, Loại đèn, Công suất, Ảnh, Thời gian cập nhật, Marker gốc, Khoảng cách (m), Mã PE, Đường, Phường/ Xã, VN2000-X, VN2000-Y, Số lượng đèn, Loại cáp, Độ chính xác (m), Chế độ GPS`.
- ID có prefix địa bàn `CG` (vd `CG_001`). Chỉ còn địa bàn Cần Giuộc (đã bỏ các địa bàn cũ).
- Sheet phụ chung: `TaiKhoan` (auth, có cột `vung`), `LichSu` (audit log).

### Đèn tắt — tab `DanhSachDen` (gid 887845918)
20 cột, **có lỗi chính tả cố ý phải giữ nguyên**: `lontitude` (kinh độ), `Trang thai` (không dấu), `HÌnh ảnh` (Ì hoa).
Đầy đủ: `ID, Số trụ, Tên tủ, latitude, lontitude, Loại đèn, Công suất, Trang thai, Đường, Phường, Ngày phát hiện, Người phát hiện, Ngày sửa, Người sửa, Vật tư sửa, HÌnh ảnh, Ghi chú, VN2000-X, VN2000-Y, Số điện thoại`.
- Sheet phụ chung: `TaiKhoan`; `PhuTrach` (gid 1867964478, người ký biên bản theo phường).
- Trạng thái 1–7 (`STATUS_CONFIG`): hư = {1,2,5,7}. Quick fix: 1/5→3, 7→4, 2→6.
- Cột ngày ép TEXT (`@`) trong GAS để Sheets không đảo ngày/tháng (`DATE_TEXT_COLS`).
- ID = `Date.now()`; `findRowNum` ưu tiên khớp ID, fallback Số trụ (để `bcsc` không ghi đè).

---

## 6. Backend GAS

**Một Web App hợp nhất đã deploy:** `gas/gas-unified.js` phục vụ cả 2 module, định tuyến theo field `module` trong payload, **CORS bật** cho mọi response. `core-config.js` đã đặt `GAS.UNIFIED` + `GAS.USE_UNIFIED=true` → `gasFor()` trả URL chung; client đọc JSON (`readResponse:true`, đã bỏ `no-cors`). 2 module có shim tự chèn `module` vào mọi request.

`doPost` router theo `action`: `login`, `change_credentials`, `full_update`, `delete_row`, `upload_image`, `github_write_file`, `log_action`; `findRowNum/updateRow/appendRow`, `handleImageUpload` (push GitHub).

**Mật khẩu `TaiKhoan` lưu hash SHA-256** (`hashPassword`): đăng nhập đúng tự nâng cấp plaintext cũ → hash, hoặc chạy `migratePasswordsToHash()` một lần trong editor.

**Script Properties:** `GITHUB_TOKEN` (scope `contents:write`, upload ảnh) + tùy chọn `AUTH_PEPPER` (đặt TRƯỚC khi migrate/login — đổi sau làm sai mọi hash cũ).

---

## 7. Quy ước code

- **Ngôn ngữ:** 100% tiếng Việt (UI, comment, tên biến xen tiếng Việt). Giữ nguyên phong cách này.
- **Vanilla JS, không build.** Thêm thư viện qua `<script src>` CDN. Core là IIFE gắn vào `window.CSGT`.
- **Endpoint không hardcode** trong module — luôn lấy từ `window.CSGT_CONFIG`.
- **Logic dùng chung** → `core/`. **Logic nghiệp vụ riêng** → giữ trong module (xem mục 8).
- **Phân quyền nằm ở client** (server GAS hiện tin client). Khi cần chặt hơn, thêm kiểm tra ở GAS.
- **PWA:** đổi code core/HTML → tăng `VERSION` trong `sw.js` để client tải bản mới.
- **Link tương đối trong module con:** `../manifest.json`, `../sw.js`, cross-link module: `../dentat/index.html`.

---

## 8. Logic GIỮ RIÊNG mỗi module (không đưa vào core)

- **Khảo sát:** schema 25 cột + `FIELD_MAP` khảo sát; chế độ GPS Phone/RTK; icon marker theo loại đèn/công suất; sơ đồ cáp & vẽ cáp (`banve-mau.html`); bản vẽ kỹ thuật (khung tên); audit `LichSu`; chỉ đường OSRM; xem phố Mapillary.
- **Đèn tắt:** `STATUS_CONFIG` + `createStatusIcon`; quick fix; biên bản sự cố (`printBienBan`/Word); nhập từ Zalo (`parseZaloMessage`/`parseLatLonFromText`); kênh người dân `bcsc.html`; quy trình phối hợp `quytrinh.html`.

---

## 9. Deploy / chạy

- **Hosting:** GitHub Pages từ repo này (site tĩnh). `start_url` = `index.html`.
- **CI:** `.github/workflows/bump-version.yml` tự tăng `data/version.json` mỗi push vào `main` (trừ khi chỉ đổi version.json).
- **GAS:** sửa code GAS → Apps Script → Deploy → Web App (Execute as Me, Anyone) → cập nhật URL vào `core-config.js`.
- **Chạy local:** VS Code Live Server (port 5502 trong `.vscode/settings.json`) → mở `index.html`.
- Cần thêm icon PWA thật vào `data/icon-192.png`, `data/icon-512.png` (đã có bản copy từ dentat).

---

## 10. Lưu ý quan trọng (gotchas)

- **OneDrive không chứa được `.git` đang hoạt động** — thao tác git trực tiếp trong thư mục OneDrive sẽ lỗi "Operation not permitted". Clone/làm việc ở thư mục **ngoài** OneDrive, hoặc dùng bản `.zip` repo.
- **Không đổi tên cột Sheet** (`lontitude`, `Trang thai`, `HÌnh ảnh` là cố ý) — chỉ ánh xạ qua `fieldMap`.
- **Đổi code GAS phải Deploy lại Web App** rồi cập nhật URL trong `core-config.js`.
- **Đổi repo ảnh** → cập nhật `GITHUB.REPO_*` và giữ/migrate đường dẫn `raw.githubusercontent` cũ để không vỡ ảnh lịch sử.
- **`bcsc.html` và `lichsu.html`** đã centralize về `core/` (endpoint từ `CSGT_CONFIG`, dùng `CSGT.sync/image/geo/export`).
- Mật khẩu `TaiKhoan` lưu **hash SHA-256** trong `gas-unified.js` (xem mục 6) — không còn plaintext.
- **Chạy test:** `npm test` (= `node tests/core.test.js`) — test thuần cho hàm lõi (CSV, VN2000, DXF), không cần cài đặt.

---

## 11. Roadmap

- [x] Giai đoạn 1 — chung hạ tầng (repo, core-config, PWA, CI)
- [x] Giai đoạn 2 — tách 6 module core + chuyển UI cả 2 module sang dùng core
- [x] GAS hợp nhất `gas/gas-unified.js` đã deploy; `core-config.js` bật `GAS.USE_UNIFIED=true`
- [x] 2 module dùng chung 1 Spreadsheet Cần Giuộc (đọc + ghi); chỉ còn dữ liệu Cần Giuộc
- [x] Hash mật khẩu `TaiKhoan` (SHA-256 + auto-upgrade + `migratePasswordsToHash`)
- [x] Centralize `bcsc.html`/`lichsu.html` về core; đèn tắt ghi bằng đọc-JSON (bỏ no-cors)
- [x] Test harness lõi (`npm test`)
- [ ] Smoke test thực tế + chạy `migratePasswordsToHash()` một lần sau deploy
- [ ] Icon PWA thật (`data/icon-192.png`, `data/icon-512.png`)