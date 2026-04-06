const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// USDC memiliki 6 desimal
const USDC_DECIMALS = 6n;
const toUsdc = (amount) => BigInt(Math.round(amount * 1e6));

// Deteksi apakah sedang deploy ke Sepolia atau localhost
const isTestnet = network.name === "sepolia";
const networkId = isTestnet ? "11155111" : "31337";
const networkName = isTestnet ? "Sepolia Testnet" : "Hardhat Local";

async function main() {
  console.log(`🚀 Deploying ke ${networkName}...\n`);

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("📍 Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer ETH balance:", ethers.formatEther(balance), "ETH (untuk gas)\n");

  if (isTestnet && parseFloat(ethers.formatEther(balance)) < 0.01) {
    throw new Error("❌ ETH tidak cukup untuk deploy ke Sepolia! Minimal 0.01 ETH. Gunakan faucet Sepolia.");
  }

  // ─── Deploy MockUSDC ──────────────────────────────────────────────────────
  console.log("⏳ Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await MockUSDC.deploy();
  await mockUsdc.waitForDeployment();
  const usdcAddress = await mockUsdc.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);

  // ─── Mint USDC ke deployer ────────────────────────────────────────────────
  const mintAmount = toUsdc(100000); // 100,000 USDC untuk deployer
  await (await mockUsdc.mint(deployer.address, mintAmount)).wait();
  console.log(`\n💸 Minted ${mintAmount / 10n ** USDC_DECIMALS} USDC ke Deployer: ${deployer.address}`);

  // ─── Deploy DonationSystem ────────────────────────────────────────────────
  console.log("\n⏳ Deploying DonationSystem...");
  const DonationSystem = await ethers.getContractFactory("DonationSystem");
  const donationSystem = await DonationSystem.deploy(usdcAddress);
  await donationSystem.waitForDeployment();
  const contractAddress = await donationSystem.getAddress();
  console.log("✅ DonationSystem deployed to:", contractAddress);

  // Verify deployer as creator
  await (await donationSystem.verifyCreator(deployer.address, true)).wait();
  console.log(`\n✅ Deployer verified as creator`);

  // ─── Seed dummy campaigns (hanya untuk localhost) ──────────────────────────
  if (!isTestnet) {
    const donor1 = signers[1];
    const donor2 = signers[2];

    await (await mockUsdc.mint(donor1.address, toUsdc(10000))).wait();
    await (await mockUsdc.mint(donor2.address, toUsdc(10000))).wait();
    console.log(`\n💸 Minted 10000 USDC ke Donor1 & Donor2 (localhost only)`);

    console.log("\n📦 Seeding dummy campaigns...");

    const campaigns = [
      {
        title: "Beasiswa Pendidikan Anak Yatim 2025",
        description: "Program beasiswa untuk membantu anak-anak yatim piatu melanjutkan pendidikan hingga jenjang SMA. Dana digunakan untuk biaya sekolah, seragam, dan perlengkapan belajar.",
        category: "Pendidikan",
        imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
        targetUsdc: 2000,
        durationDays: 60,
      },
      {
        title: "Pembangunan Masjid Al-Ikhlas Desa Sukamakmur",
        description: "Renovasi dan perluasan masjid Al-Ikhlas yang sudah berdiri selama 30 tahun. Bangunan lama sudah tidak mampu menampung jamaah yang terus bertambah.",
        category: "Keagamaan",
        imageUrl: "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=800",
        targetUsdc: 5000,
        durationDays: 90,
      },
      {
        title: "Bantuan Korban Bencana Banjir Bandang Cianjur",
        description: "Penggalangan dana darurat untuk korban banjir bandang di Cianjur. Dana akan digunakan untuk logistik makanan, air bersih, obat-obatan, dan hunian sementara.",
        category: "Bencana Alam",
        imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800",
        targetUsdc: 3500,
        durationDays: 30,
      },
      {
        title: "Operasi Gratis Katarak untuk Lansia Tidak Mampu",
        description: "Program operasi katarak gratis bekerja sama dengan rumah sakit setempat. Target 50 pasien lansia yang tidak mampu agar dapat kembali melihat dengan jelas.",
        category: "Kesehatan",
        imageUrl: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800",
        targetUsdc: 4000,
        durationDays: 45,
      },
      {
        title: "Pengembangan UMKM Ibu-Ibu Pesisir Pantai",
        description: "Pemberdayaan ibu-ibu nelayan melalui pelatihan membuat kerajinan tangan dan olahan ikan. Dana digunakan untuk modal awal, pelatihan, dan pemasaran produk.",
        category: "Pemberdayaan",
        imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
        targetUsdc: 1500,
        durationDays: 75,
      },
    ];

    const createdIds = [];

    for (const c of campaigns) {
      const tx = await donationSystem.createCampaign(
        c.title, c.description, c.category, c.imageUrl,
        toUsdc(c.targetUsdc), c.durationDays, deployer.address
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => { try { return donationSystem.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "CampaignCreated");
      const id = event ? Number(event.args.campaignId) : null;
      createdIds.push(id);
      console.log(`  ✓ [${id}] ${c.title} — Target: ${c.targetUsdc} USDC`);
    }

    console.log("\n💸 Seeding dummy donations...");

    const bigApproval = toUsdc(9999);
    await (await mockUsdc.connect(donor1).approve(contractAddress, bigApproval)).wait();
    await (await mockUsdc.connect(donor2).approve(contractAddress, bigApproval)).wait();
    console.log("  ✓ Donor1 & Donor2 sudah approve USDC ke DonationSystem");

    const donationsData = [
      { signer: donor1, campaignIdx: 0, usdcAmt: 250, name: "Budi Santoso", msg: "Semoga bermanfaat untuk adik-adik!" },
      { signer: donor2, campaignIdx: 0, usdcAmt: 150, name: "Sari Dewi", msg: "Aamiin, semoga tercapai targetnya." },
      { signer: donor1, campaignIdx: 1, usdcAmt: 500, name: "Hendra Wijaya", msg: "Lillahi ta'ala, semoga segera terwujud." },
      { signer: donor2, campaignIdx: 2, usdcAmt: 300, name: "Fitria Rahmah", msg: "Bantuan kecil untuk saudara yang terdampak. 🙏" },
      { signer: donor1, campaignIdx: 3, usdcAmt: 200, name: "Agus Prasetyo", msg: "Semoga para lansia segera dapat melihat kembali." },
      { signer: donor2, campaignIdx: 4, usdcAmt: 100, name: "Rina Kusuma", msg: "Dukung UMKM lokal!" },
      { signer: donor1, campaignIdx: 1, usdcAmt: 400, name: "Darmawan", msg: "Insya Allah berkah." },
      { signer: donor2, campaignIdx: 2, usdcAmt: 250, name: "Lestari", msg: "Untuk saudara-saudara kita yang membutuhkan." },
    ];

    for (const d of donationsData) {
      const campId = createdIds[d.campaignIdx];
      if (!campId) continue;
      await (await donationSystem.connect(d.signer).donate(campId, d.name, d.msg, toUsdc(d.usdcAmt))).wait();
      console.log(`  ✓ Donasi ${d.usdcAmt} USDC dari "${d.name}" → Kampanye #${campId}`);
    }
  } else {
    console.log("\n📦 [Sepolia] Skipping dummy data seeding — buat kampanye via UI.");
    console.log(`\n💡 Untuk berdonasi di Sepolia:`);
    console.log(`   1. Mint USDC ke diri sendiri: panggil mockUsdc.mint(alamatmu, 100000000000) via Hardhat atau contract.`);
    console.log(`   2. Atau gunakan frontend — fitur "Mint USDC" jika ada.`);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Contract Addresses:");
  console.log("  MockUSDC:       ", usdcAddress);
  console.log("  DonationSystem: ", contractAddress);

  // ─── Auto-update frontend .env ───────────────────────────────────────────
  const envPath = path.resolve(__dirname, "../../frontend/.env");
  
  // Baca konten lama jika ada untuk mempertahankan variabel lain (seperti RPC URL)
  let existingEnv = "";
  let walletConnectId = "";
  let sepoliaRpcUrl = "";

  if (fs.existsSync(envPath)) {
    existingEnv = fs.readFileSync(envPath, "utf8");
    const mId = existingEnv.match(/VITE_WALLETCONNECT_PROJECT_ID=(.+)/);
    if (mId) walletConnectId = mId[1].trim();
    
    const mRpc = existingEnv.match(/VITE_SEPOLIA_RPC_URL=(.+)/);
    if (mRpc) sepoliaRpcUrl = mRpc[1].trim();
  }

  const envContent = [
    `VITE_CONTRACT_ADDRESS=${contractAddress}`,
    `VITE_USDC_ADDRESS=${usdcAddress}`,
    `VITE_NETWORK_ID=${networkId}`,
    `VITE_NETWORK_NAME=${networkName}`,
    walletConnectId ? `VITE_WALLETCONNECT_PROJECT_ID=${walletConnectId}` : "",
    sepoliaRpcUrl ? `VITE_SEPOLIA_RPC_URL=${sepoliaRpcUrl}` : "",
  ].filter(Boolean).join("\n") + "\n";

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log("\n✅ Frontend .env diupdate otomatis:");
  console.log(`   ${envPath}`);
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   VITE_USDC_ADDRESS=${usdcAddress}`);
  console.log(`   VITE_NETWORK_ID=${networkId}`);
  console.log(`   VITE_NETWORK_NAME=${networkName}`);

  if (isTestnet) {
    console.log("\n🔷 Langkah selanjutnya:");
    console.log("   1. Restart frontend: npm run dev (di folder frontend)");
    console.log("   2. Di MetaMask: ganti network ke Sepolia");
    console.log("   3. Mint USDC ke wallet Anda via MockUSDC.mint()");
    console.log(`   4. Buka https://sepolia.etherscan.io/address/${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
