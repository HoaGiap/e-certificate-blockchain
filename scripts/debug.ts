import hre from "hardhat";

async function main() {
  console.log("HRE Keys:", Object.keys(hre));
  if ((hre as any).viem) {
    console.log("HRE.viem exists!");
  } else {
    console.log("HRE.viem is MISSING");
  }
}

main().catch(console.error);
