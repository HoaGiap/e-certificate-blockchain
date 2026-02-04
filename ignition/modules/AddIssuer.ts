import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AddIssuerModule = buildModule("AddIssuerModule_v3", (m) => {
  // 1. Kết nối với contract đã deploy
  const CONTRACT_ADDRESS = "0xc17FA456C6f011E3b708a7807A839A0c72Fd0eEc";
  const certificateSBT = m.contractAt("CertificateSBT", CONTRACT_ADDRESS);

  // 2. Thông tin Issuer mới
  const NEW_ISSUER_ADDRESS = "0x986F86674b50411A7B26a8a6B60f8Dac49863F8d";
  const SCHOOL_NAME = "Đại học Công Nghệ (Demo)";

  // 3. Gọi hàm addIssuer
  m.call(certificateSBT, "addIssuer", [NEW_ISSUER_ADDRESS, SCHOOL_NAME]);

  return { certificateSBT };
});

export default AddIssuerModule;
