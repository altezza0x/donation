const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying DonationSystem smart contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  const DonationSystem = await ethers.getContractFactory("DonationSystem");
  console.log("⏳ Deploying contract...");

  const donationSystem = await DonationSystem.deploy();
  await donationSystem.waitForDeployment();

  const contractAddress = await donationSystem.getAddress();
  console.log("✅ DonationSystem deployed to:", contractAddress);

  // Seed with sample data for demo
  console.log("\n📦 Seeding sample data for demo...");

  // Create sample campaigns
  const campaigns = [
    {
      title: "Beasiswa Anak Yatim Piatu",
      description:
        "Program beasiswa untuk membantu anak-anak yatim piatu mendapatkan pendidikan yang layak. Dana akan digunakan untuk biaya sekolah, buku, dan perlengkapan belajar.",
      category: "Pendidikan",
      imageUrl: "",
      target: ethers.parseEther("2"),
      duration: 30,
    },
    {
      title: "Bantuan Korban Banjir Sulawesi",
      description:
        "Membantu korban banjir di Sulawesi dengan menyediakan kebutuhan dasar seperti makanan, pakaian, dan tempat penampungan sementara.",
      category: "Bencana Alam",
      imageUrl: "",
      target: ethers.parseEther("5"),
      duration: 14,
    },
    {
      title: "Pembangunan Masjid Desa Terpencil",
      description:
        "Pembangunan masjid untuk masyarakat di desa terpencil yang belum memiliki tempat ibadah yang memadai.",
      category: "Keagamaan",
      imageUrl: "",
      target: ethers.parseEther("3"),
      duration: 60,
    },
    {
      title: "Operasi Katarak Gratis",
      description:
        "Program operasi mata katarak gratis untuk lansia kurang mampu agar dapat kembali melihat dan menjalani hidup dengan normal.",
      category: "Kesehatan",
      imageUrl: "",
      target: ethers.parseEther("1.5"),
      duration: 45,
    },
  ];

  for (const campaign of campaigns) {
    const tx = await donationSystem.createCampaign(
      campaign.title,
      campaign.description,
      campaign.category,
      campaign.imageUrl,
      campaign.target,
      campaign.duration
    );
    await tx.wait();
    console.log(`✅ Campaign "${campaign.title}" created`);
  }

  // Make sample donations to first campaign
  const accounts = await ethers.getSigners();
  const donors = accounts.slice(1, 4);

  for (let i = 0; i < donors.length; i++) {
    // Donate to campaign 1
    await donationSystem.connect(donors[i]).donate(
      1,
      `Donatur ${i + 1}`,
      "Semoga bermanfaat, aamiin!",
      { value: ethers.parseEther("0.1") }
    );
    console.log(`✅ Donation from Donor ${i + 1} to Campaign 1`);
  }

  // Get final stats
  const stats = await donationSystem.getPlatformStats();
  console.log("\n📊 Platform Statistics:");
  console.log("  Total Campaigns:", stats[0].toString());
  console.log("  Total Donations:", stats[1].toString());
  console.log(
    "  Total Funds Raised:",
    ethers.formatEther(stats[2]),
    "ETH"
  );
  console.log("  Active Campaigns:", stats[3].toString());

  console.log("\n🎉 Deployment complete!");
  console.log("📋 Contract Address:", contractAddress);
  console.log(
    "\n💡 Copy this address to your frontend .env file:"
  );
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`VITE_NETWORK_ID=31337`);
  console.log(`VITE_NETWORK_NAME=Hardhat Local`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
