import { ethers } from "ethers";
import CertificateSBT from "../src/contracts/CertificateSBT.json";
import DeployedAddresses from "../src/contracts/deployed_addresses.json";

// Lấy địa chỉ contract từ file đã copy
// Lưu ý: Key trong file json của bạn là "CertificateSBTModule#CertificateSBT"
const CONTRACT_ADDRESS =
  DeployedAddresses["CertificateSBTModule#CertificateSBT_v3"];

export const getContract = async (signer) => {
  return new ethers.Contract(CONTRACT_ADDRESS, CertificateSBT.abi, signer);
};

export const connectWallet = async () => {
  if (!window.ethereum) throw new Error("Vui lòng cài ví Metamask!");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
};
