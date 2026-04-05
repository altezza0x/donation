const { ethers } = require("hardhat");

async function main() {
  console.log("Memulai proses whitelist...");

  // Alamat wallet baru yang ingin di-whitelist (Edit ini sesuai dengan akun MetaMask Anda yang baru)
  // Anda bisa mengganti argumen ini saat menjalankannya di terminal.
  const targetAddress = process.env.TARGET_ADDRESS || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Default ke Hardhat Account #1

  // Alamat Smart Contract Anda yang aktif (dari hasil deploy sebelumnya)
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Dapatkan deployer (owner contract)
  const [deployer] = await ethers.getSigners();
  console.log("Admin (Owner):", deployer.address);

  // Hubungkan ke smart contract
  const DonationSystem = await ethers.getContractFactory("DonationSystem");
  const donationSystem = DonationSystem.attach(contractAddress);

  // Jalankan fungsi verifyCreator (Hanya deployer yang bisa)
  console.log(`Menambahkan wallet: ${targetAddress} ke whitelist...`);
  const tx = await donationSystem.verifyCreator(targetAddress, true);
  await tx.wait();

  console.log(`✅ Success! Wallet ${targetAddress} sekarang SUDAH TERVERIFIKASI dan bisa membuat kampanye!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Gagal:", error);
    process.exit(1);
  });
