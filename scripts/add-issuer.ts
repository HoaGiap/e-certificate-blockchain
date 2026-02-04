import hre from "hardhat";

async function main() {
  // 1. Địa chỉ contract đã deploy (Lấy từ deployed_addresses.json của bạn)
  const CONTRACT_ADDRESS = "0xc4c92321fE3Fd6231b1995E62c482A613F2ae5CE";

  // 2. Thay thế bằng địa chỉ ví Metamask bạn đang dùng trên web
  const NEW_ISSUER_ADDRESS = "0x986F86674b50411A7B26a8a6B60f8Dac49863F8d";
  const SCHOOL_NAME = "Đại học Công Nghệ (Demo)"; // Tên trường bạn muốn hiển thị

  console.log(`Đang kết nối tới contract tại: ${CONTRACT_ADDRESS}...`);

  // Lấy instance của contract bằng Viem
  const contract = await hre.viem.getContractAt(
    "CertificateSBT",
    CONTRACT_ADDRESS,
  );

  // Lấy public client để chờ transaction confirmation
  const publicClient = await hre.viem.getPublicClient();

  // Lưu ý: Script này sẽ chạy bằng ví Deployer (được cấu hình trong hardhat.config.ts)
  // nên nó có quyền Admin để thêm người khác.
  console.log(`Đang cấp quyền ISSUER cho ví: ${NEW_ISSUER_ADDRESS}...`);

  try {
    // Gọi hàm addIssuer từ contract (Viem syntax: contract.write.functionName)
    const hash = await contract.write.addIssuer([
      NEW_ISSUER_ADDRESS,
      SCHOOL_NAME,
    ]);
    console.log("Transaction Hash:", hash);

    // Đợi transaction được xác nhận
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Thành công! Ví của bạn đã trở thành Issuer.");
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
