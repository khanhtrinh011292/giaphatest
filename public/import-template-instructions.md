# Hướng dẫn Import Gia Phả từ Excel

## Các cột bắt buộc / tuỳ chọn

| Cột | Bắt buộc | Mô tả |
|---|---|---|
| `ho_ten` | ✅ | Họ và tên đầy đủ |
| `gioi_tinh` | – | nam / nữ / khác (mặc định: nam) |
| `nam_sinh` | – | Năm sinh dương lịch (VD: 1990) |
| `the_he` | – | Thuộc đời thứ (VD: 1, 2, 3) |
| `thu_tu_sinh` | – | Thứ tự sinh trong gia đình |
| `stt_cha` | – | Số hàng của người cha trong file |
| `stt_me` | – | Số hàng của người mẹ trong file |
| `ghi_chu` | – | Ghi chú tự do |

## Cách điền stt_cha / stt_me

Ví dụ file có cấu trúc:
```
Hàng 1: Nguyễn Văn Tổ (ông tổ)
Hàng 2: Nguyễn Thị Tổ Mẫu (bà tổ)
Hàng 3: Nguyễn Văn A (con trưởng)
```

Thì hàng 3 (Nguyễn Văn A) sẽ điền: `stt_cha = 1`, `stt_me = 2`

## Lưu ý
- Hệ thống bỏ qua hàng trống hoặc thiếu họ tên
- Nếu `stt_cha` / `stt_me` không tìm thấy trong file, quan hệ sẽ bị bỏ qua (không báo lỗi)
- Tên cột không phân biệt hoa thường, có/không dấu
