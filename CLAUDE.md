# CLAUDE.md — CSGT Platform (Xã Cần Giuộc)

> Quy ước, quy trình và tài liệu kỹ thuật cho Claude Code (và lập trình viên) trong repo này.
> **Đọc file này đầu mỗi phiên. Cập nhật ở bước Reflect cuối mỗi vòng.**

---

## 0. Bối cảnh dự án

- **Tên:** CSGT Platform — *Hệ thống Quản lý Chiếu sáng Công cộng* của **Xã Cần Giuộc**.
- **Mục tiêu:** Kiểm kê trụ–tủ–đèn trên bản đồ và theo dõi đèn hư/tắt — phục vụ quản lý, sửa chữa, lập biên bản sự cố chiếu sáng công cộng.
- **Người dùng:** Cán bộ kỹ thuật chiếu sáng công cộng Xã Cần Giuộc; thêm kênh người dân báo sự cố.
- **Trạng thái:** Đang phát triển — đã gộp 2 module vào chung hạ tầng, đang hợp nhất backend GAS.
- **Chủ dự án:** Mai Vũ Lâm — LAVIPCO. Giao tiếp và tài liệu bằng **tiếng Việt**.

---

## 1. Quy tắc vàng (đọc trước khi làm bất cứ việc gì)

1. **KHÔNG CODE NGAY.** Luôn đi qua quy trình Sprint ở Mục 2.
2. **Mỗi lần chỉ làm MỘT task.** Xong thì **DỪNG**, tóm tắt thay đổi + cách kiểm tra, **đợi tôi duyệt** rồi mới sang task kế.
3. **Không tự ý mở rộng phạm vi.** Phát hiện việc ngoài plan → ghi vào Backlog (Mục 18), hỏi trước khi làm.
4. **Thà hỏi 1 câu làm rõ** còn hơn đoán sai rồi làm lại.
5. **Commit nhỏ:** mỗi commit = 1 task, mô tả rõ ràng bằng tiếng Việt.
6. **Không sửa test để né lỗi.** Test đỏ thì sửa code.
7. Khi báo cáo: nói **đã thay đổi gì**, **cách kiểm tra**, **rủi ro còn lại** — ngắn gọn.

---

## 2. Quy trình Sprint (mỗi vòng = một lát cắt tính năng nhỏ, ship được)

`Think → Plan → Build → Review → Test → Ship → Reflect → ↻`

Mỗi bước có **cổng (gate)**; chưa đạt cổng thì **không** sang bước sau.

| # | Bước | Cổng để qua |
|---|------|-------------|
| 01 | **Think** — hiểu vấn đề | Nói được “Xong nghĩa là gì” + 3–5 tiêu chí chấp nhận + non-goals |
| 02 | **Plan** — thiết kế | Task list được duyệt, mỗi task có cách kiểm tra; rủi ro lớn có cách xử lý |
| 03 | **Build** — xây dựng | Task chạy, không phá app, có diff + cách kiểm tra |
| 04 | **Review** — soát xét | Hết issue mức Blocker; code khớp plan & tiêu chí |
| 05 | **Test** — kiểm thử | 100% tiêu chí chấp nhận pass; chạy thử trên trình duyệt; không bug nặng |
| 06 | **Ship** — phát hành | Deploy ok, smoke test ok, có đường lùi (rollback) |
| 07 | **Reflect** — nhìn lại | ≥1 cải tiến quy trình + backlog vòng sau; **cập nhật file này** |

> Mặc định: ở **Plan** hãy dùng *plan mode* — lập kế hoạch trước, không sửa file cho tới khi tôi duyệt.

---

## 3. Dự án là gì

Repo gộp của hai web app cùng tác giả (Mai Vũ Lâm), cùng hạ tầng, **giữ 2 module riêng**:

| Module | Thư mục | Vai trò | Nguồn gốc |
|---|---|---|---|
| **Khảo sát** | `khaosat/` | Kiểm kê trụ–tủ–đèn trên bản đồ, GPS/RTK, xuất CAD VN2000, bản vẽ | `lighting-survey` cũ |
| **Đèn tắt** | `dentat/` | Theo dõi đèn hư/tắt, biên bản sự cố, phối hợp đơn vị quản lý hạ tầng, kênh người dân | `dentat` cũ |

Hai module là **hai nửa của một vòng đời**: khảo sát *sinh ra* dữ liệu trụ → đèn tắt *theo dõi sự cố* trên cùng cây trụ đó.

Tài liệu liên quan: `docs/KE-HOACH-GOP-DU-AN.md` (lộ trình gộp), `docs/MIGRATION.md` (ánh xạ hàm cũ → core).

---

## 4. Tech stack

| Lớp | Công nghệ |
|---|---|
| **Frontend** | HTML thuần + vanilla JS (PWA) — **không framework, không bundler** |
| **Backend** | Google Apps Script (Web App) |
| **Dữ liệu** | Google Sheets (đọc CSV published-to-web, ghi qua GAS) |
| **Lưu ảnh** | GitHub Contents API → `raw.githubusercontent` |
| **Hạ tầng** | GitHub Pages (site tĩnh) |
| **Ngôn ngữ chính** | JavaScript |

---

## 5. Kiến trúc (serverless, không build step)

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

## 6. Cấu trúc thư mục

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

## 7. Thư viện core — `window.CSGT`

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

## 8. Data model — Google Sheets

> **⚠️ Chung dữ liệu trụ/đèn:** Hai module thao tác trên **cùng một danh sách trụ vật lý** — khảo sát kiểm kê cây trụ, đèn tắt theo dõi sự cố *trên chính cây trụ đó*. Tức `DanhSachTru` (khảo sát) và `DanhSachDen` (đèn tắt) mô tả **cùng tập trụ**, không phải hai tập tách biệt. Khi sửa data model/config/đồng bộ, phải coi đây là **một nguồn trụ chung** (mục tiêu hợp nhất). Hiện cấu hình code vẫn còn 2 Spreadsheet/2 GAS riêng — cần dọn ở task sau.

Mỗi module hiện trỏ Spreadsheet riêng (sẽ hợp nhất sau). **Tuyệt đối không đổi tên cột Sheet đang chạy** — chỉ ánh xạ qua `fieldMap` trong `core-config.js`.

### Khảo sát — sheet `DanhSachTru`
25 cột: `ID, Tên trụ, Lat, Lon, Ghi chú, Người KS, Loại, Tủ điều khiển, Loại trụ, Loại cần, Loại đèn, Công suất, Ảnh, Thời gian cập nhật, Marker gốc, Khoảng cách (m), Mã PE, Đường, Phường/ Xã, VN2000-X, VN2000-Y, Số lượng đèn, Loại cáp, Độ chính xác (m), Chế độ GPS`.
- Dữ liệu Cần Giuộc ở Spreadsheet riêng (`EXTERNAL_SPREADSHEET_IDS.CanGiuoc`).
- ID có prefix địa bàn `CG` (vd `CG_001`).
- Sheet phụ: `TaiKhoan` (auth, có cột `vung`), `LichSu` (audit log).

### Đèn tắt — sheet `DanhSachDen`
20 cột, **có lỗi chính tả cố ý phải giữ nguyên**: `lontitude` (kinh độ), `Trang thai` (không dấu), `HÌnh ảnh` (Ì hoa).
Đầy đủ: `ID, Số trụ, Tên tủ, latitude, lontitude, Loại đèn, Công suất, Trang thai, Đường, Phường, Ngày phát hiện, Người phát hiện, Ngày sửa, Người sửa, Vật tư sửa, HÌnh ảnh, Ghi chú, VN2000-X, VN2000-Y, Số điện thoại`.
- Sheet phụ: `TaiKhoan`, `PhuTrach` (người ký biên bản theo phường).
- Trạng thái 1–7 (`STATUS_CONFIG`): hư = {1,2,5,7}. Quick fix: 1/5→3, 7→4, 2→6.
- Cột ngày ép TEXT (`@`) trong GAS để Sheets không đảo ngày/tháng (`DATE_TEXT_COLS`).
- ID = `Date.now()`; `findRowNum` ưu tiên khớp ID, fallback Số trụ (để `bcsc` không ghi đè).

---

## 9. Backend GAS

Hiện **hai file GAS riêng** (chưa đưa vào repo này — sống trong Apps Script của từng Spreadsheet):
- Khảo sát: `gas-khaosat.js` (CORS bật → client đọc JSON).
- Đèn tắt: `gas.js` (client ghi bằng `no-cors`; login/upload đọc JSON).

Cấu trúc giống nhau: `doPost` router theo `action` (`login`, `full_update`, `delete_row`, `upload_image`, …), `handleLogin` (đọc `TaiKhoan`), `findRowNum/updateRow/appendRow`, `handleImageUpload` (push GitHub).

**Cần Script Property `GITHUB_TOKEN`** (scope `contents:write`) để upload ảnh.

### ⚠️ Việc còn lại: hợp nhất GAS
Gộp 2 file thành **một Web App**, thêm tham số `module` để chọn `SHEET_NAME` + `FIELD_MAP` + repo ảnh; **bật CORS** cho mọi response. Sau đó trong `core-config.js`:
```js
GAS.UNIFIED = '<url web app mới>';
GAS.USE_UNIFIED = true;   // gasFor() tự dùng URL chung; client đặt readResponse:true cho cả 2 module
```

---

## 10. Quy ước code

- **Ngôn ngữ:** 100% tiếng Việt (UI, comment, tên biến xen tiếng Việt). Giữ nguyên phong cách này.
- **Vanilla JS, không build.** Thêm thư viện qua `<script src>` CDN. Core là IIFE gắn vào `window.CSGT`.
- **Endpoint không hardcode** trong module — luôn lấy từ `window.CSGT_CONFIG`.
- **Logic dùng chung** → `core/` (một nguồn duy nhất). **Logic nghiệp vụ riêng** → giữ trong module (xem Mục 11).
- Ưu tiên **rõ ràng hơn khôn khéo**; hàm nhỏ, một việc; tách logic dùng lại thành hàm/module riêng.
- Không thêm thư viện mới nếu chưa thật cần — nếu cần, **nêu lý do** trước.
- Xử lý lỗi tường minh; không nuốt exception âm thầm.
- **Phân quyền nằm ở client** (server GAS hiện tin client). Khi cần chặt hơn, thêm kiểm tra ở GAS.
- **PWA:** đổi code core/HTML → tăng `VERSION` trong `sw.js` để client tải bản mới.
- **Link tương đối trong module con:** `../manifest.json`, `../sw.js`; cross-link module: `../dentat/index.html`.
- Bí mật (API key, token) để trong Script Property / biến môi trường, **không** commit.

---

## 11. Logic GIỮ RIÊNG mỗi module (không đưa vào core)

- **Khảo sát:** schema 25 cột + `FIELD_MAP` khảo sát; chế độ GPS Phone/RTK; icon marker theo loại đèn/công suất; sơ đồ cáp & vẽ cáp (`banve-mau.html`); bản vẽ kỹ thuật (khung tên); audit `LichSu`; chỉ đường OSRM; xem phố Mapillary.
- **Đèn tắt:** `STATUS_CONFIG` + `createStatusIcon`; quick fix; biên bản sự cố (`printBienBan`/Word); nhập từ Zalo (`parseZaloMessage`/`parseLatLonFromText`); kênh người dân `bcsc.html`; quy trình phối hợp `quytrinh.html`.

---

## 12. Quy ước file & tài liệu (LAVIPCO)

- **Tài liệu hành chính/pháp lý:** dùng font **Times New Roman** (TIMES.TTF, TIMESBD.TTF, TIMESI.TTF, TIMESBI.TTF). Nếu môi trường chưa có font, hãy yêu cầu cung cấp trước khi xuất.
- **Đặt tên file xuất kèm đuôi đôi** để giữ phần mở rộng sau khi tải, ví dụ: `Bao_gia_v1.1.pdf.pdf`, `Bao_cao.docx.docx`.
- **Tăng version mỗi lần xuất:** `v1.0 → v1.1 → v1.2 …`
- **Định dạng ngày:** `dd/mm/yyyy`. Tiền tệ: VND, phân tách hàng nghìn bằng dấu chấm.
- Tên thư mục/file không dấu, dùng `_` thay khoảng trắng.

---

## 13. Lệnh thường dùng & Deploy

- **Chạy local:** VS Code Live Server (port 5502 trong `.vscode/settings.json`) → mở `index.html`. Không có bước cài đặt/build/test runner.
- **Hosting:** GitHub Pages từ repo này (site tĩnh). `start_url` = `index.html`.
- **CI:** `.github/workflows/bump-version.yml` tự tăng `data/version.json` mỗi push vào `main` (trừ khi chỉ đổi version.json).
- **Deploy app:** push lên `main` → GitHub Pages tự cập nhật; nhớ tăng `VERSION` trong `sw.js` khi đổi core/HTML.
- **Deploy GAS:** sửa code GAS → Apps Script → Deploy → Web App (Execute as Me, Anyone) → cập nhật URL vào `core-config.js`.
- Cần thêm icon PWA thật vào `data/icon-192.png`, `data/icon-512.png` (đã có bản copy từ dentat).

---

## 14. Definition of Done (một task coi là xong khi)

- [ ] Đạt đúng các tiêu chí chấp nhận đã chốt ở **Think**.
- [ ] Đã chạy thử trên trình duyệt (cả mobile nếu liên quan UI) và hoạt động đúng.
- [ ] Đã tự review theo checklist Mục 15.
- [ ] Không phá tính năng cũ (không hồi quy).
- [ ] Commit nhỏ, mô tả rõ; `VERSION`/tài liệu cập nhật nếu cần.

---

## 15. Checklist Review (đóng vai reviewer khó tính, không tự khen)

- [ ] Đúng tiêu chí chấp nhận?
- [ ] Edge case: rỗng, âm, quá lớn, mất mạng, dữ liệu sai, CSV lỗi định dạng?
- [ ] Lỗi bảo mật: lộ key/token, injection, phân quyền?
- [ ] Trùng lặp / có thể tách vào `core/` dùng lại?
- [ ] Không đổi tên cột Sheet đang chạy?
- [ ] Đặt tên rõ; không để lại code chết, log rác?
- [ ] Phụ thuộc mới có thật cần thiết?

---

## 16. KHÔNG làm

- Không nhảy thẳng vào code khi chưa qua Think/Plan.
- Không làm cả tính năng trong một lượt; không gộp nhiều task vào một commit lớn.
- Không lệch khỏi plan mà không báo.
- Không ship khi chưa chạy thử hoặc chưa có rollback.
- Không xóa/sửa hàng loạt file ngoài phạm vi task đang làm.
- Không đổi tên cột Sheet, không hardcode endpoint trong module.

---

## 17. Lưu ý quan trọng (gotchas)

- **OneDrive không chứa được `.git` đang hoạt động** — thao tác git trực tiếp trong thư mục OneDrive sẽ lỗi "Operation not permitted". Clone/làm việc ở thư mục **ngoài** OneDrive, hoặc dùng bản `.zip` repo.
- **Không đổi tên cột Sheet** (`lontitude`, `Trang thai`, `HÌnh ảnh` là cố ý) — chỉ ánh xạ qua `fieldMap`.
- **Đổi code GAS phải Deploy lại Web App** rồi cập nhật URL trong `core-config.js`.
- **Đổi repo ảnh** → cập nhật `GITHUB.REPO_*` và giữ/migrate đường dẫn `raw.githubusercontent` cũ để không vỡ ảnh lịch sử.
- **`bcsc.html` và `lichsu.html`** hiện còn dùng CSV/GAS inline riêng — chưa centralize (tùy chọn làm sau).
- Mật khẩu `TaiKhoan` lưu **hash SHA-256** (`gas-unified.js`: `hashPassword`); đăng nhập đúng tự nâng cấp plaintext cũ → hash, hoặc chạy `migratePasswordsToHash()` một lần. Tùy chọn Script Property `AUTH_PEPPER` (đặt **trước** khi migrate/login).

---

## 18. Roadmap & Backlog

> Claude cập nhật mục này ở bước **Reflect**.

- [x] Giai đoạn 1 — chung hạ tầng (repo, core-config, PWA, CI)
- [x] Giai đoạn 2 — tách 6 module core + chuyển UI cả 2 module sang dùng core
- [x] GAS hợp nhất đã viết: `gas/gas-unified.js` (+ `gas/README.md`); 2 module đã có shim tự chèn `module`
- [ ] **Deploy** `gas/gas-unified.js` (điền SPREADSHEET_IDS + GITHUB_TOKEN, Deploy Web App "Anyone")
      rồi điền `GAS.UNIFIED` + bật `GAS.USE_UNIFIED=true` trong `core-config.js`
- [ ] Centralize CSV/GAS inline trong `bcsc.html` và `lichsu.html`
- [x] Hash mật khẩu trong `TaiKhoan` (SHA-256 + auto-upgrade + `migratePasswordsToHash()` trong `gas-unified.js`)
- [ ] Thêm icon PWA thật (`data/icon-192.png`, `data/icon-512.png`)
- [ ] **Hợp nhất nguồn trụ chung:** 2 module dùng chung dữ liệu trụ/đèn (cùng cây trụ) → gộp về 1 Spreadsheet/1 GAS/1 TaiKhoan trong `core-config.js` + `gas-unified.js`
