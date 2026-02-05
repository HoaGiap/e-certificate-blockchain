# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN (DÀNH CHO NGƯỜI MỚI)

Tài liệu này hướng dẫn bạn cách tải mã nguồn, cấu hình tài khoản cá nhân và chạy ứng dụng E-Certificate Blockchain trên máy tính của bạn.

---

## 1. Yêu cầu cần có

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

- **Node.js** (Phiên bản 18 trở lên): [Tải tại đây](https://nodejs.org/)
- **Git**: [Tải tại đây](https://git-scm.com/)
- **Ví Metamask**: Cài đặt extension trên trình duyệt Chrome/Edge.
- **Tiền Testnet**: Vào [Cronos Faucet](https://cronos.org/faucet) để xin TCRO (Cronos Testnet Token) miễn phí.

---

## 2. Cài đặt Dư án

### Bước 1: Tải mã nguồn (Clone Code)

Mở Terminal (hoặc CMD/PowerShell) và chạy lệnh:

```bash
git clone <LINK_GITHUB_CUA_BAN>
cd e-certificate-blockchain
```

### Bước 2: Cài đặt thư viện

Chạy lệnh sau để tải các gói cần thiết:

```bash
npm install
```

_Lưu ý: Nếu gặp lỗi, hãy thử `npm install --legacy-peer-deps`_

---

## 3. Cấu hình Tài khoản (QUAN TRỌNG)

Để bạn có thể làm **Admin** và tự quản lý hệ thống, bạn cần thay thế tài khoản mặc định bằng tài khoản của bạn.

### Bước 1: Lấy Private Key (Khóa riêng tư)

1. Mở Metamask -> Chọn dấu 3 chấm -> **Account Details** (Chi tiết tài khoản).
2. Chọn **Show Private Key** (Hiện khóa riêng tư).
3. Copy chuỗi ký tự đó (Ví dụ: `0xabc123...`).

### Bước 2: Cập nhật file cấu hình

Mở file `hardhat.config.ts` trong thư mục gốc.
Tìm đến đoạn `networks -> cronos -> accounts` và thay thế bằng Private Key của bạn:

```typescript
    cronos: {
      type: "http",
      chainType: "l1",
      url: "https://evm-t3.cronos.org",
      accounts: [
        "PRIVATE_KEY_CUA_BAN_VAO_DAY" // <-- Dán Private Key của bạn vào đây
      ],
    },
```

⚠️ **Cảnh báo**: Tuyệt đối không chia sẻ file này có chứa Private Key cho người lạ!

---

## 4. Triển khai Hợp đồng Thông minh (Smart Contract)

Sau khi cấu hình ví, bạn cần đưa Hợp đồng của riêng bạn lên mạng Blockchain (Deploy).

Chạy lệnh sau:

```bash
npx hardhat ignition deploy ignition/modules/CertificateSBT.ts --network cronos
```

Sau khi chạy xong, màn hình sẽ hiện ra địa chỉ Contract mới (Ví dụ: `0x123...abc`).
Hệ thống sẽ tự động cập nhật địa chỉ này vào file `frontend/src/contracts/deployed_addresses.json`.

**Tuy nhiên**, bạn cần kiểm tra lại file `frontend/utils/contractConfig.js` để đảm bảo nó đang trỏ đúng phiên bản mới nhất:

```javascript
// Ví dụ: CertificateSBTModule#CertificateSBT_v<SO_PHIEN_BAN>
const CONTRACT_ADDRESS =
  DeployedAddresses["CertificateSBTModule#CertificateSBT_v6"];
```

_Nếu bạn deploy lần đầu, có thể nó sẽ là `CertificateSBTModule#CertificateSBT` (không có \_v...). Hãy sửa lại file config cho khớp với tên trong `deployed_addresses.json`._

---

## 5. Chạy Ứng dụng Frontend

Cuối cùng, khởi chạy giao diện web:

```bash
cd frontend
npm install  # Cài đặt thư viện cho frontend (nếu chưa làm)
npm run dev
```

Mở trình duyệt và truy cập: `http://localhost:3000`

---

## 6. Sử dụng

1. **Kết nối ví**: Bấm nút "Connect Connect" ở góc phải. Chọn ví Metamask chứa tài khoản bạn vừa dùng để Deploy.
2. **Cấp quyền (Admin)**: Vì bạn là người Deploy, bạn mặc định là **Admin**.
   - Vào `/admin` để thêm các trường đại học khác.
3. **Cấp bằng (Issuer)**:
   - Vào `/issuer` (hoặc ngay Trang chủ nếu bạn dùng giao diện v6) để cấp bằng cho sinh viên.

Chúc bạn thành công!
