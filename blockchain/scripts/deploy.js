const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying DonationSystem smart contract...\n");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const donor1 = signers[1];
  const donor2 = signers[2];

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

  // Verify deployer as creator
  const verifyTx = await donationSystem.verifyCreator(deployer.address, true);
  await verifyTx.wait();
  console.log(`\n✅ Deployer verified as creator`);

  // ─── Seed dummy campaigns ────────────────────────────────────────────────
  console.log("\n📦 Seeding dummy campaigns...");

  const now = Math.floor(Date.now() / 1000);

  const campaigns = [
    {
      title: "Beasiswa Pendidikan Anak Yatim 2025",
      description:
        "Program beasiswa untuk membantu anak-anak yatim piatu melanjutkan pendidikan hingga jenjang SMA. Dana digunakan untuk biaya sekolah, seragam, dan perlengkapan belajar.",
      category: "Pendidikan",
      imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
      targetEth: "2.0",
      durationDays: 60,
    },
    {
      title: "Pembangunan Masjid Al-Ikhlas Desa Sukamakmur",
      description:
        "Renovasi dan perluasan masjid Al-Ikhlas yang sudah berdiri selama 30 tahun. Bangunan lama sudah tidak mampu menampung jamaah yang terus bertambah.",
      category: "Keagamaan",
      imageUrl: "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=800",
      targetEth: "5.0",
      durationDays: 90,
    },
    {
      title: "Bantuan Korban Bencana Banjir Bandang Cianjur",
      description:
        "Penggalangan dana darurat untuk korban banjir bandang di Cianjur. Dana akan digunakan untuk logistik makanan, air bersih, obat-obatan, dan hunian sementara.",
      category: "Bencana Alam",
      imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800",
      targetEth: "3.5",
      durationDays: 30,
    },
    {
      title: "Operasi Gratis Katarak untuk Lansia Tidak Mampu",
      description:
        "Program operasi katarak gratis bekerja sama dengan rumah sakit setempat. Target 50 pasien lansia yang tidak mampu agar dapat kembali melihat dengan jelas.",
      category: "Kesehatan",
      imageUrl: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800",
      targetEth: "4.0",
      durationDays: 45,
    },
    {
      title: "Pengembangan UMKM Ibu-Ibu Pesisir Pantai",
      description:
        "Pemberdayaan ibu-ibu nelayan melalui pelatihan membuat kerajinan tangan dan olahan ikan. Dana digunakan untuk modal awal, pelatihan, dan pemasaran produk.",
      category: "Pemberdayaan",
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
      targetEth: "1.5",
      durationDays: 75,
    },
  ];

  const createdIds = [];

  for (const c of campaigns) {
    const tx = await donationSystem.createCampaign(
      c.title,
      c.description,
      c.category,
      c.imageUrl,
      ethers.parseEther(c.targetEth),
      c.durationDays,
      deployer.address // beneficiary = deployer for demo
    );
    const receipt = await tx.wait();
    // Read campaignId from event
    const event = receipt.logs
      .map((log) => {
        try { return donationSystem.interface.parseLog(log); } catch { return null; }
      })
      .find((e) => e && e.name === "CampaignCreated");
    const id = event ? Number(event.args.campaignId) : null;
    createdIds.push(id);
    console.log(`  ✓ [${id}] ${c.title}`);
  }

  // ─── Seed dummy donations ────────────────────────────────────────────────
  console.log("\n💸 Seeding dummy donations...");

  const donationsData = [
    { signer: donor1, campaignIdx: 0, ethAmt: "0.25", name: "Budi Santoso",    msg: "Semoga bermanfaat untuk adik-adik!" },
    { signer: donor2, campaignIdx: 0, ethAmt: "0.15", name: "Sari Dewi",       msg: "Aamiin, semoga tercapai targetnya." },
    { signer: donor1, campaignIdx: 1, ethAmt: "0.50", name: "Hendra Wijaya",   msg: "Lillahi ta'ala, semoga segera terwujud." },
    { signer: donor2, campaignIdx: 2, ethAmt: "0.30", name: "Fitria Rahmah",   msg: "Bantuan kecil untuk saudara yang terdampak. 🙏" },
    { signer: donor1, campaignIdx: 3, ethAmt: "0.20", name: "Agus Prasetyo",   msg: "Semoga para lansia segera dapat melihat kembali." },
    { signer: donor2, campaignIdx: 4, ethAmt: "0.10", name: "Rina Kusuma",     msg: "Dukung UMKM lokal!" },
    { signer: donor1, campaignIdx: 1, ethAmt: "0.40", name: "Darmawan",        msg: "Insya Allah berkah." },
    { signer: donor2, campaignIdx: 2, ethAmt: "0.25", name: "Lestari",         msg: "Untuk saudara-saudara kita yang membutuhkan." },
  ];

  for (const d of donationsData) {
    const campId = createdIds[d.campaignIdx];
    if (!campId) continue;
    const tx = await donationSystem.connect(d.signer).donate(
      campId,
      d.name,
      d.msg,
      { value: ethers.parseEther(d.ethAmt) }
    );
    await tx.wait();
    console.log(`  ✓ Donasi ${d.ethAmt} ETH dari "${d.name}" → Kampanye #${campId}`);
  }

  // ─── Done ────────────────────────────────────────────────────────────────
  console.log("\n🎉 Deployment & seeding complete!");
  console.log("📋 Contract Address:", contractAddress);
  console.log("\n💡 Copy this address to your frontend .env file:");
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
