# Hướng dẫn Deploy lên Synology NAS

Hướng dẫn này giúp bạn tự host **Quản Lý Gia Phả Việt Nam** trực tiếp trên Synology NAS, toàn bộ dữ liệu sẽ nằm trên thiết bị của bạn.

> **Kiến trúc:** Next.js app chạy trong Docker container trên NAS → kết nối tới Supabase (cloud hoặc tự host).

---

## Yêu cầu

- Synology NAS chạy **DSM 7.x**
- Đã cài package **Container Manager** (tìm trong Package Center)
- NAS có kết nối Internet
- RAM tối thiểu: **2 GB** (khuyến nghị 4 GB)

---

## Bước 1: Chuẩn bị Database (Supabase)

Ứng dụng sử dụng Supabase làm database. Bạn có 2 lựa chọn:

### Lựa chọn A — Supabase Cloud (miễn phí, đơn giản hơn)

1. Tạo tài khoản tại [supabase.com](https://supabase.com)
2. Tạo **New Project**, chờ 1–2 phút khởi tạo
3. Vào **Project Settings → API**, lưu lại:
   - `Project URL`
   - `anon / public` key

### Lựa chọn B — Supabase tự host trên NAS (toàn quyền kiểm soát)

Xem hướng dẫn chính thức: [supabase.com/docs/guides/self-hosting/docker](https://supabase.com/docs/guides/self-hosting/docker)

Tóm tắt nhanh qua SSH trên NAS:

```bash
# Clone repo Supabase
cd /volume1/docker
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Sao chép và chỉnh sửa file cấu hình
cp .env.example .env
# Chỉnh sửa .env: đặt mật khẩu, JWT secret,...
nano .env

# Khởi động Supabase
docker compose up -d
```

Sau đó truy cập Supabase Studio tại `http://<IP-NAS-CUA-BAN>:8000` để lấy URL và API key.

---

## Bước 2: Tải mã nguồn lên NAS

### Cách A — Qua SSH (khuyến nghị)

Bật SSH trong **DSM → Control Panel → Terminal & SNMP → Enable SSH Service**, sau đó:

```bash
ssh admin@<IP-NAS-CUA-BAN>

mkdir -p /volume1/docker/giaphaonline
cd /volume1/docker/giaphaonline

git clone https://github.com/khanhtrinh011292/giaphaonline.git .
```

### Cách B — Qua File Station

1. Tải file ZIP từ [github.com/khanhtrinh011292/giaphaonline](https://github.com/khanhtrinh011292/giaphaonline)
2. Giải nén và upload toàn bộ lên `/volume1/docker/giaphaonline/` qua **File Station**

---

## Bước 3: Tạo file `.env`

Trong thư mục `/volume1/docker/giaphaonline/`, tạo file `.env`:

```bash
cp .env.example .env
nano .env
```

Điền đầy đủ các giá trị:

```env
SITE_NAME="Quản Lý Gia Phả Việt Nam"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
APP_PORT=3000
```

---

## Bước 4: Deploy qua Container Manager (Giao diện DSM)

1. Mở **Container Manager** trong DSM
2. Chọn tab **Project** → nhấn **Create**
3. Điền thông tin:
   - **Project name:** `giaphaonline`
   - **Path:** `/volume1/docker/giaphaonline`
   - **Source:** chọn **Use an existing docker-compose.yml**
4. Nhấn **Next** → **Done**
5. Container Manager sẽ tự động build image và khởi động container (~3–5 phút)

### Hoặc deploy qua SSH

```bash
cd /volume1/docker/giaphaonline
docker compose up -d --build
```

---

## Bước 5: Truy cập ứng dụng

Mở trình duyệt và truy cập:

```
http://<IP-NAS-CUA-BAN>:3000
```

Ví dụ: `http://192.168.1.100:3000`

> Người đăng ký tài khoản **đầu tiên** sẽ tự động được cấp quyền **Admin**.

---

## Cấu hình Supabase Redirect URL

Sau khi deploy, nếu gặp lỗi `Failed to fetch` khi đăng ký, cần thêm URL của NAS vào Supabase:

1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → Project → **Authentication → URL Configuration**
2. **Site URL:** `http://<IP-NAS-CUA-BAN>:3000`
3. **Redirect URLs:** thêm `http://<IP-NAS-CUA-BAN>:3000/**`
4. Nhấn **Save**

---

## Truy cập từ Internet (Tùy chọn)

Để truy cập từ bên ngoài mạng nội bộ:

### Cách 1 — Synology DDNS + Reverse Proxy

1. **DSM → Control Panel → External Access → DDNS** → thêm hostname miễn phí `*.synology.me`
2. **DSM → Control Panel → Login Portal → Advanced → Reverse Proxy** → tạo rule:
   - Source: `https://giaphaonline.ten-cua-ban.synology.me:443`
   - Destination: `http://localhost:3000`
3. Mở cổng **443** trên router (port forwarding đến IP NAS)

### Cách 2 — Cloudflare Tunnel (miễn phí, không cần mở port)

```bash
# Cài cloudflared trên NAS qua Docker
docker run -d --name cloudflared \
  cloudflare/cloudflared:latest tunnel --no-autoupdate run \
  --token <CLOUDFLARE_TUNNEL_TOKEN>
```

---

## Cập nhật phiên bản mới

```bash
cd /volume1/docker/giaphaonline
git pull
docker compose up -d --build
```

---

## Xem logs / debug

```bash
# Xem log realtime
docker compose logs -f app

# Kiểm tra trạng thái container
docker compose ps

# Khởi động lại
docker compose restart app
```

---

## Sao lưu dữ liệu

Toàn bộ dữ liệu gia phả được lưu trong **Supabase database**.

- **Supabase Cloud:** vào Dashboard → **Database → Backups** để tải backup tự động hàng ngày
- **Supabase tự host:** sao lưu thư mục `/volume1/docker/supabase/volumes/db/data/`

---

*Phát triển bởi [Phạm Khánh Trình](https://github.com/khanhtrinh011292) — [khanhtrinh011292/giaphaonline](https://github.com/khanhtrinh011292/giaphaonline)*
