import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CertificateSBTModule = buildModule("CertificateSBTModule", (m) => {
  const certificateSBT = m.contract("CertificateSBT", [], {
    id: "CertificateSBT_v6",
  });

  return { certificateSBT };
});

export default CertificateSBTModule;
