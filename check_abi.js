import { createRequire } from "module";
const require = createRequire(import.meta.url);
// Check backend artifact directly
const artifact = require("./artifacts/contracts/CertificateSBT.sol/CertificateSBT.json");

const mintFunc = artifact.abi.find(
  (item) => item.type === "function" && item.name === "mint",
);

if (mintFunc) {
  console.log("Backend Artifact Mint Inputs:", mintFunc.inputs);
  console.log("Count:", mintFunc.inputs.length);
} else {
  console.log("Mint function NOT found in backend ABI!");
}
