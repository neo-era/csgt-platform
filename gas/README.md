# Backend GAS hợp nhất

`gas-unified.js` — một Google Apps Script Web App phục vụ **cả hai module** (khaosat + dentat),
thay cho hai GAS riêng trước đây. Định tuyến theo field `module` trong mỗi request.

## Triển khai (1 lần)

1. Vào https://script.google.com → **New project** → xóa code mẫu → **dán toàn bộ `gas-unified.js`**.
2. Sửa **`SPREADSHEET_IDS`** ở đầu file: điền ID Spreadsheet của từng module
   (lấy từ URL Google Sheet: `.../spreadsheets/d/`**`<ID>`**`/edit`).
   - `EXTERNAL_SPREADSHEET_IDS.khaosat.CanGiuoc` đã điền sẵn (Cần Giuộc là file ngoài).
3. **Project Settings → Script Properties** → thêm:
   - `GITHUB_TOKEN` = Personal Access Token (scope `contents:write`) để upload ảnh.
4. **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**  ← bắt buộc để client đọc được JSON response.
5. Copy **URL `/exec`**.

## Bật phía client

Trong `core/core-config.js`:

```js
const GAS = {
  ...
  UNIFIED: 'https://script.google.com/macros/s/XXXX/exec',  // dán URL vừa copy
  USE_UNIFIED: true,                                        // gasFor() tự dùng URL chung
};
```

Khi `USE_UNIFIED = true`, `gasFor('khaosat')` và `gasFor('dentat')` đều trả URL hợp nhất.
Mỗi module đã có **shim tự chèn `module`** vào mọi request tới GAS (đặt ở đầu mỗi
`index.html`), nên không cần sửa các chỗ gọi.

> Khuyến nghị: khi đã hợp nhất, đặt `readResponse: true` cho các lệnh ghi để đọc được
> kết quả (thay vì `no-cors`). Vì request dùng `Content-Type: text/plain` (core-sync làm
> sẵn) là *simple request* nên không bị preflight và đọc được response.

## Action hỗ trợ

| action | Việc | Module |
|---|---|---|
| `login` | Đăng nhập (đọc `TaiKhoan`, tự nhận cột `vung` nếu có) | cả hai |
| `full_update` | Thêm/sửa 1 bản ghi (map qua `fieldMap`, ép TEXT cột ngày) | cả hai |
| `delete_row` | Xóa theo ID (fallback tên/số trụ) | cả hai |
| `upload_image` | base64 → GitHub repo của module | cả hai |
| `github_write_file` / `upload_to_github` | Ghi file bất kỳ (Excel/DXF) lên GitHub | cả hai |
| `log_action` | Ghi audit log vào sheet `LichSu` | chỉ khaosat |

## Khác biệt được giữ đúng theo module

- **fieldMap riêng** (khaosat 25 cột; dentat giữ cột lỗi `lontitude`/`Trang thai`/`HÌnh ảnh`).
- **Cột ngày ép TEXT** (`Ngày phát hiện`, `Ngày sửa`) chỉ áp cho dentat.
- **Tìm hàng**: khaosat theo `ID`/`Tên trụ` (+`oldTenTru`); dentat theo `ID`/`Số trụ`.
- **Repo ảnh**: `neo-era/lighting-survey` vs `neo-era/dentat`.
- **File ngoài**: Cần Giuộc của khaosat mở bằng `openById`.

## Lưu ý

- **Mỗi lần sửa code GAS phải Deploy lại** (Manage deployments → Edit → New version) — URL `/exec` giữ nguyên nếu cập nhật cùng deployment.
- GAS hiện **tin tưởng client** về phân quyền (giống bản cũ). Muốn chặt hơn thì kiểm tra role trong `doPost` trước khi ghi.
- Hai GAS cũ có thể giữ lại tới khi xác nhận bản hợp nhất chạy ổn, rồi gỡ.
