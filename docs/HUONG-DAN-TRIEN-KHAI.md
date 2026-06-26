# Hướng dẫn triển khai CSGT Platform (từng bước)

Tài liệu này hướng dẫn anh **tự thao tác** để đưa hệ thống gộp lên chạy hoàn chỉnh.
Làm tuần tự từ Bước 1 → 8. Mỗi bước có thể kiểm tra xong mới sang bước sau.

Tổng thời gian: ~30–45 phút. Không cần biết lập trình, chỉ cần làm đúng các thao tác.

---

## Bước 0 — Chuẩn bị

1. **Giải nén** `csgt-platform-repo.zip` ra **một thư mục NGOÀI OneDrive**.
   Ví dụ: `C:\dev\csgt-platform` (tạo thư mục `C:\dev` rồi giải nén vào đó).
   > ⚠️ Không để trong OneDrive vì OneDrive khóa thư mục `.git`, làm git báo lỗi.
2. (Khuyến nghị) Cài sẵn nếu chưa có:
   - **Git**: https://git-scm.com/download/win
   - **VS Code**: https://code.visualstudio.com (để xem/sửa file tiện hơn).

Sau giải nén, mở thư mục thấy: `index.html`, các thư mục `core/`, `khaosat/`, `dentat/`, `gas/`, `docs/`…

---

## Bước 1 — Đưa code lên GitHub

Mục tiêu: tạo repo mới `csgt-platform` trên GitHub để host bằng GitHub Pages.

1. Vào https://github.com → đăng nhập tài khoản **neo-era** → góc trên phải bấm **+** → **New repository**.
2. *Repository name*: `csgt-platform` → để **Public** → **KHÔNG** tick "Add README" → **Create repository**.
3. Mở **Terminal/Git Bash** trong thư mục đã giải nén (chuột phải trong thư mục → *Open Git Bash here*), chạy lần lượt:

```bash
git remote add origin https://github.com/neo-era/csgt-platform.git
git branch -M main
git push -u origin main
```

> Repo đã có sẵn lịch sử commit; lệnh trên chỉ đẩy lên GitHub. Nếu hỏi đăng nhập, dùng tài khoản GitHub (hoặc Personal Access Token).

**Kiểm tra:** mở `https://github.com/neo-era/csgt-platform` thấy đủ file là OK.

---

## Bước 2 — Bật GitHub Pages

1. Trong repo `csgt-platform` → **Settings** (tab trên cùng) → mục **Pages** (cột trái).
2. *Source*: chọn **Deploy from a branch** → *Branch*: **main** / **/(root)** → **Save**.
3. Đợi 1–2 phút. Pages sẽ hiện link:
   **`https://neo-era.github.io/csgt-platform/`**

**Kiểm tra:** mở link đó → thấy trang chọn module (Khảo sát / Đèn tắt). Lúc này bấm vào module
**chưa lưu được** vì backend GAS chưa cấu hình — sẽ làm ở Bước 3–5.

---

## Bước 3 — Lấy ID của 2 Google Spreadsheet

Cần ID của hai bảng dữ liệu để backend đọc/ghi.

1. Mở **Google Sheet KHẢO SÁT** (bảng chứa tab `DanhSachTru`). Nhìn URL trên trình duyệt:
   `https://docs.google.com/spreadsheets/d/`**`1AbC...XyZ`**`/edit`
   → phần in đậm giữa `/d/` và `/edit` chính là **ID**. Copy lại.
2. Làm tương tự với **Google Sheet ĐÈN TẮT** (bảng chứa tab `DanhSachDen`).

Ghi ra giấy/notepad 2 ID này. (Cần Giuộc là file riêng, đã điền sẵn trong code.)

> 💡 Nếu muốn gọn hơn, anh có thể gộp hai bảng về **một Spreadsheet** (mỗi loại 1 tab:
> DanhSachTru + các tab địa bàn + DanhSachDen + TaiKhoan + PhuTrach + LichSu) rồi điền
> **cùng một ID** cho cả hai. Tùy anh.

---

## Bước 4 — Deploy backend GAS hợp nhất

1. Vào https://script.google.com → **New project**.
2. Xóa hết code mẫu → mở file `gas/gas-unified.js` trong thư mục đã giải nén → **copy toàn bộ** → dán vào.
3. Sửa đầu file, điền 2 ID ở Bước 3 vào:
   ```js
   const SPREADSHEET_IDS = {
     khaosat: 'DÁN_ID_KHẢO_SÁT_VÀO_ĐÂY',
     dentat:  'DÁN_ID_ĐÈN_TẮT_VÀO_ĐÂY',
   };
   ```
4. **Thêm GITHUB_TOKEN** (để upload ảnh):
   - Bánh răng **Project Settings** (cột trái) → kéo xuống **Script Properties** → **Add script property**.
   - *Property*: `GITHUB_TOKEN` — *Value*: dán Personal Access Token GitHub (scope `contents:write`,
     có quyền cả 2 repo `neo-era/lighting-survey` và `neo-era/dentat`). → **Save**.
   - (Tạo token: GitHub → Settings → Developer settings → Personal access tokens.)
5. **Deploy:** nút **Deploy** (phải trên) → **New deployment** → bánh răng chọn **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**  ← bắt buộc.
   - **Deploy** → cấp quyền (Authorize) nếu được hỏi → **copy URL** kết thúc bằng `/exec`.

**Kiểm tra:** mở URL `/exec` trên trình duyệt → thấy dòng JSON
`{"status":"ok","message":"CSGT unified GAS — sẵn sàng..."}` là OK.

---

## Bước 5 — Bật backend hợp nhất ở phía web

1. Mở file `core/core-config.js` (bằng VS Code hoặc Notepad).
2. Tìm khối `const GAS = {` → sửa 2 dòng:
   ```js
   UNIFIED: 'DÁN_URL_/exec_Ở_BƯỚC_4',
   USE_UNIFIED: true,
   ```
3. Lưu file. Đẩy thay đổi lên GitHub (trong Git Bash tại thư mục repo):
   ```bash
   git add core/core-config.js
   git commit -m "config: bật GAS hợp nhất"
   git push
   ```
4. Đợi ~1 phút để GitHub Pages cập nhật.

---

## Bước 6 — Tài khoản đăng nhập

Đăng nhập đọc từ sheet **`TaiKhoan`** trong mỗi Spreadsheet. Mở từng Sheet, kiểm tra tab
`TaiKhoan` có các cột (dòng 1 là tiêu đề):

| tenDangNhap | matKhau | hoTen | vaiTro | vung *(chỉ khảo sát)* |
|---|---|---|---|---|
| admin | (mật khẩu) | Họ tên | admin | *(để trống = mọi địa bàn)* |

- **vaiTro**: `admin` (toàn quyền), `user` (xem/sửa/xóa), `user1` (xem/sửa — khảo sát), `demo` (chỉ xem).
- **vung** (khảo sát): danh sách tab địa bàn cách nhau dấu phẩy, vd `CanGiuoc,BenCat`; để trống = tất cả.

> Nếu gộp 2 bảng về 1 Spreadsheet thì chỉ cần **một** tab `TaiKhoan` dùng chung.

---

## Bước 7 — Kiểm tra hoạt động

Mở `https://neo-era.github.io/csgt-platform/` rồi test lần lượt:

**Module Đèn tắt:**
1. Bấm thẻ **Quản lý đèn tắt** → đăng nhập.
2. Bản đồ hiện các đèn (đọc từ Sheet `DanhSachDen`).
3. Thêm 1 đèn thử (GPS hoặc click bản đồ) → **Lưu** → mở lại Google Sheet xem có dòng mới.
4. Thử upload 1 ảnh → kiểm tra ảnh xuất hiện (ảnh lưu trên GitHub repo `dentat`).

**Module Khảo sát:**
1. Quay lại trang chủ → **Khảo sát chiếu sáng** → đăng nhập.
2. Đổi địa bàn (vd Cần Giuộc) → thấy các trụ.
3. Thêm/sửa 1 trụ → kiểm tra ghi vào Sheet đúng tab.

**Nếu lưu được + ảnh lên được = hệ thống hợp nhất đã chạy hoàn chỉnh.** 🎉

---

## Bước 8 — Hoàn thiện (tùy chọn)

- **Icon ứng dụng**: đã có sẵn `data/icon-192.png`, `data/icon-512.png`. Muốn icon riêng cho
  CSGT thì thay 2 file này (cùng kích thước) rồi push lại.
- **Cài như app điện thoại**: mở link trên Chrome/Safari điện thoại → menu → *Thêm vào màn hình chính*.
- **Gỡ 2 GAS cũ**: sau khi xác nhận bản hợp nhất chạy ổn vài ngày, có thể xóa 2 deployment GAS cũ.
- **Bảo mật**: mật khẩu trong `TaiKhoan` đang để thường (plaintext). Nếu cần, sau này hash lại.

---

## Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Mở `/exec` báo lỗi quyền | Deploy chưa chọn *Who has access = Anyone*. Vào **Manage deployments** → Edit → sửa lại. |
| Đăng nhập báo "Sheet TaiKhoan chưa được tạo" | Sai `SPREADSHEET_IDS` hoặc thiếu tab `TaiKhoan`. Kiểm tra lại ID ở Bước 3–4. |
| Lưu xong nhưng Sheet không có dòng mới | Sai ID Spreadsheet của module đó, hoặc chưa Deploy lại sau khi sửa GAS. |
| Upload ảnh lỗi | Thiếu/ sai `GITHUB_TOKEN`, hoặc token không có quyền repo ảnh. |
| Sửa code GAS xong không thấy tác dụng | Phải **Deploy lại**: Manage deployments → Edit → *Version: New version* → Deploy. |
| Trang không cập nhật sau khi push | Đợi 1–2 phút (GitHub Pages build); hoặc tải lại trang bỏ cache (Ctrl+F5). |
| Bản đồ trắng / không có marker | Sheet chưa publish CSV, hoặc mạng chặn Google. Kiểm tra link CSV trong `core-config.js`. |

---

## Tóm tắt cần điền

| Mục | Lấy ở đâu | Điền vào |
|---|---|---|
| ID Spreadsheet khảo sát | URL Google Sheet khảo sát | `gas-unified.js` → `SPREADSHEET_IDS.khaosat` |
| ID Spreadsheet đèn tắt | URL Google Sheet đèn tắt | `gas-unified.js` → `SPREADSHEET_IDS.dentat` |
| GITHUB_TOKEN | GitHub → Developer settings | Script Properties của GAS |
| URL `/exec` | Sau khi Deploy GAS | `core-config.js` → `GAS.UNIFIED` (+ `USE_UNIFIED:true`) |

Xong 4 dòng này là hệ thống chạy. Có vướng ở bước nào cứ chụp màn hình hỏi lại.
