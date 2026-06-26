# Kế hoạch gộp dự án: lighting-survey + dentat

**Phương án chọn:** Chung hạ tầng — 2 module riêng
**Ngày lập:** 26/06/2026
**Người lập:** Mai Vũ Lâm (CSCC TP.HCM)

---

## 1. Mục tiêu

Gộp hai web app `lighting-survey` (Khảo sát chiếu sáng) và `dentat` (Quản lý đèn tắt) về **chung một hạ tầng** — chung repo, chung backend Google Apps Script, chung Google Spreadsheet, chung thư viện code lõi — nhưng **vẫn giữ hai module/giao diện riêng biệt**.

Kết quả mong muốn: bảo trì một chỗ thay vì hai chỗ, dùng chung dữ liệu trụ/đèn, nhưng rủi ro thấp vì không phải viết lại toàn bộ UI.

---

## 2. Hiện trạng hai dự án

| Hạng mục | lighting-survey | dentat |
|---|---|---|
| Mục đích | Khảo sát, kiểm kê trụ–tủ–đèn | Quản lý đèn hư/tắt, biên bản sự cố |
| File chính | `index.html` (~6.221 dòng) | `dentat.html` (~2.771 dòng) |
| Trang phụ | huongdan, lichsu, banve-mau | huongdan, quytrinh, bcsc |
| Backend | `gas-khaosat.js` (GAS) | `gas.js` (GAS) |
| Sheet chính | `DanhSachTru` (25 cột) | `DanhSachDen` (20 cột) |
| Auth sheet | `TaiKhoan` | `TaiKhoan` |
| Audit | `LichSu` | (không có) |
| Lưu ảnh | GitHub `neo-era/lighting-survey/images` | GitHub `neo-era/dentat/images` |
| PWA theme | xanh dương `#2563eb` | sky `#0ea5e9` / navy |
| Thư viện | Leaflet, MarkerCluster, SheetJS, jQuery, Bootstrap | Leaflet, MarkerCluster, SheetJS |

**Điểm chung (tái dùng được ngay):** kiến trúc serverless Sheets + GAS + GitHub Pages, PWA + Service Worker network-first, đọc CSV / ghi GAS, upload ảnh GitHub, export Excel + CAD VN2000, theme Inter.

**Điểm khác (giữ riêng theo module):** schema cột, icon/trạng thái, RTK + bản vẽ CAD (survey), biên bản sự cố + Zalo import + kênh người dân (dentat).

---

## 3. Kiến trúc đích

```
csgt-platform/  (repo gộp, GitHub Pages)
│
├── core/                       # THƯ VIỆN LÕI DÙNG CHUNG
│   ├── core-config.js          # endpoint GAS, CSV, GitHub, token (1 chỗ)
│   ├── core-auth.js            # đăng nhập, phân quyền (sheet TaiKhoan chung)
│   ├── core-map.js             # khởi tạo Leaflet, lớp nền OSM/vệ tinh, cluster
│   ├── core-sync.js            # đọc CSV + ghi GAS + cache version
│   ├── core-image.js           # upload ảnh base64 -> GAS -> GitHub
│   ├── core-export.js          # Excel (SheetJS) + CAD DXF + VN2000 transform
│   ├── core-geo.js             # Nominatim reverse geocode, OSRM chỉ đường
│   └── core-ui.css             # biến CSS chung (Inter, radius, palette)
│
├── khaosat/                    # MODULE KHẢO SÁT (từ lighting-survey)
│   ├── index.html              # chỉ còn markup + JS riêng của khảo sát
│   ├── khaosat.js              # schema 25 cột, RTK, bản vẽ, icon trụ
│   ├── banve-mau.html
│   └── lichsu.html
│
├── dentat/                     # MODULE ĐÈN TẮT (từ dentat)
│   ├── index.html
│   ├── dentat.js               # schema đèn, biên bản, Zalo import, trạng thái
│   ├── bcsc.html               # kênh người dân
│   └── quytrinh.html
│
├── huongdan.html               # hướng dẫn chung (gộp 2 bản)
├── index.html                  # trang chọn module (landing)
├── manifest.json               # 1 PWA
├── sw.js                       # 1 Service Worker
├── data/version.json
└── .github/workflows/bump-version.yml
```

**Backend:** một file GAS duy nhất (`gas.js`) phục vụ cả hai, định tuyến theo tham số `module` / `sheet` trong request. GAS hiện tại của anh đã có `FIELD_MAP`, `getSheet(name)`, `findRowNum`, `github_write_file` nên chỉ cần tổng quát hóa thêm tham số tên sheet.

**Database:** một Google Spreadsheet chứa các tab: `DanhSachTru`, `DanhSachDen`, các tab địa bàn khảo sát, `TaiKhoan` (dùng chung), `PhuTrach`, `LichSu`. Cần Giuộc và các spreadsheet ngoài vẫn liên kết qua `EXTERNAL_SPREADSHEET_IDS`.

---

## 4. Ba vấn đề phải xử lý

### 4.1 Single-file khổng lồ
Hai file HTML nhồi toàn bộ UI + CSS + JS inline. Bước bắt buộc trước khi gộp: **tách logic lõi ra các file `core/*.js`**, giữ trong mỗi module phần markup + JS đặc thù. Làm từ từ, mỗi lần tách một mảng và kiểm thử app cũ vẫn chạy.

### 4.2 Schema không đồng nhất
- dentat: `lontitude`, `Trang thai`, `HÌnh ảnh` (sai chính tả / thiếu dấu — đang chạy thật, **không đổi tên cột**).
- survey: `Lon`, `VN2000-X`...
→ Giải pháp: dùng `FIELD_MAP` riêng cho từng module (ánh xạ key JS → tên cột thật), không đụng vào cấu trúc Sheet đang vận hành.

### 4.3 Bảo mật
Cả hai lưu mật khẩu plaintext trong `TaiKhoan`. Khi gộp về một sheet auth chung, nên hash mật khẩu (tối thiểu SHA-256 + salt trong GAS) và thống nhất vai trò (admin / user / user1 / người dân).

---

## 5. Lộ trình triển khai theo giai đoạn

App cũ phải chạy suốt quá trình. Mỗi giai đoạn độc lập, kiểm thử xong mới sang bước sau.

### Giai đoạn 0 — Chuẩn bị (1–2 ngày)
- Tạo repo gộp mới (hoặc dùng một trong hai repo làm gốc).
- Sao lưu toàn bộ hai Spreadsheet + hai deployment GAS hiện tại.
- Thống nhất tên biến endpoint, đưa hết về `core-config.js`.

### Giai đoạn 1 — Gộp hạ tầng (3–5 ngày)
- Đưa hai bộ dữ liệu về **một Spreadsheet** nhiều tab (giữ nguyên tên cột cũ).
- Hợp nhất hai GAS thành **một Web App**, định tuyến theo `module`/`sheet`.
- Dùng chung sheet `TaiKhoan`, hợp nhất tài khoản.
- Một `manifest.json` + `sw.js` cho cả platform.

### Giai đoạn 2 — Tách core code (5–7 ngày)
- Rút phần lõi (map, auth, sync, image, export, geo) ra `core/*.js`.
- Mỗi module `import`/nhúng core, chỉ giữ lại schema + UI + tính năng riêng.
- Kiểm thử song song: app cũ vs module mới cho ra kết quả giống nhau.

### Giai đoạn 3 — Vỏ chung + điều hướng (2–3 ngày)
- Trang `index.html` landing chọn module; đăng nhập một lần dùng chung.
- Liên kết qua lại giữa hai module; thống nhất theme/menu.

### Giai đoạn 4 (tùy chọn) — Liên thông dữ liệu
- Khớp "Số trụ" giữa `DanhSachTru` và `DanhSachDen`: từ trụ đã khảo sát báo thẳng sự cố, không nhập lại tọa độ/tên.
- Mở rộng đa lớp về sau: camera, viễn thông, biển báo, cây xanh (đã có sẵn `thietbitichhop.xlsx`).

---

## 6. Rủi ro & lưu ý

- **Deploy GAS:** mỗi lần đổi code GAS phải Deploy lại Web App (Execute as Me, Anyone) — cập nhật lại URL trong `core-config.js`.
- **Token GitHub:** `GITHUB_TOKEN` (scope contents:write) lưu trong Script Properties; nếu gộp repo phải cấp lại quyền cho repo mới.
- **Đường dẫn ảnh cũ:** ảnh đang trỏ `raw.githubusercontent.com/neo-era/<repo>/...`; nếu đổi repo phải giữ lại hoặc migrate đường dẫn cũ để không vỡ ảnh lịch sử.
- **Version PWA:** gộp Service Worker phải tăng cache version để client tải lại bản mới.
- **Không đổi tên cột Sheet đang chạy** — chỉ ánh xạ qua FIELD_MAP.

---

## 7. Khuyến nghị bước kế tiếp

1. Quyết định lấy repo nào làm gốc (đề xuất: tạo repo mới `csgt-platform` cho sạch).
2. Bắt đầu Giai đoạn 0–1 (gộp hạ tầng) vì rủi ro thấp, giá trị cao ngay.
3. Module hóa core (Giai đoạn 2) là phần tốn công nhất — nên làm cẩn thận, có kiểm thử đối chiếu.

> Khi anh sẵn sàng, em có thể bắt tay dựng khung repo gộp + `core-config.js` + tách module core đầu tiên.
