import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CertificateSBTModule = buildModule("CertificateSBTModule", (m) => {
  const certificateSBT = m.contract("CertificateSBT");

  return { certificateSBT };
});

export default CertificateSBTModule;
