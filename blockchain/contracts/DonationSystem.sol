// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DonationSystem
 * @dev Smart contract untuk sistem donasi digital berbasis blockchain
 * @notice Implementasi untuk skripsi: "Implementasi Teknologi Blockchain pada
 *         Prototype Sistem Donasi Digital Berbasis Web untuk Menjamin Transparansi Transaksi"
 */
contract DonationSystem {
    // ========== STRUCTS ==========

    struct Campaign {
        uint256 id;
        address payable owner;
        string title;
        string description;
        string category;
        string imageUrl;
        uint256 targetAmount;
        uint256 raisedAmount;
        uint256 deadline;
        bool isActive;
        bool isWithdrawn;
        uint256 donorCount;
        uint256 createdAt;
    }

    struct Donation {
        uint256 id;
        uint256 campaignId;
        address donor;
        string donorName;
        uint256 amount;
        string message;
        uint256 timestamp;
        bytes32 txHash;
    }

    // Struct baru untuk riwayat penarikan dana
    struct Withdrawal {
        uint256 id;
        uint256 campaignId;
        string campaignTitle;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
    }

    // ========== STATE VARIABLES ==========

    address public owner;
    uint256 public platformFee = 0; // 0% fee untuk prototype
    uint256 private campaignCounter;
    uint256 private donationCounter;
    uint256 private withdrawalCounter;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Donation[]) public campaignDonations;
    mapping(uint256 => Donation) public donations;
    mapping(address => uint256[]) public userDonationIds;
    mapping(address => uint256[]) public userCampaignIds;
    mapping(uint256 => Withdrawal) public withdrawals;
    mapping(uint256 => uint256) public campaignWithdrawalId; // campaignId => withdrawalId

    uint256[] public campaignIds;
    uint256[] public withdrawalIds;

    // ========== EVENTS ==========

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed owner,
        string title,
        uint256 targetAmount,
        uint256 deadline
    );

    event DonationMade(
        uint256 indexed donationId,
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event CampaignDeactivated(
        uint256 indexed campaignId,
        uint256 timestamp
    );

    // ========== MODIFIERS ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Hanya pemilik kontrak yang dapat melakukan ini");
        _;
    }

    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId > 0 && _campaignId <= campaignCounter, "Kampanye tidak ditemukan");
        _;
    }

    modifier campaignActive(uint256 _campaignId) {
        require(campaigns[_campaignId].isActive, "Kampanye tidak aktif");
        require(block.timestamp <= campaigns[_campaignId].deadline, "Kampanye telah berakhir");
        _;
    }

    // ========== CONSTRUCTOR ==========

    constructor() {
        owner = msg.sender;
    }

    // ========== CAMPAIGN FUNCTIONS ==========

    /**
     * @dev Membuat kampanye donasi baru
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _category,
        string memory _imageUrl,
        uint256 _targetAmount,
        uint256 _durationDays
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Judul tidak boleh kosong");
        require(_targetAmount > 0, "Target donasi harus lebih dari 0");
        require(_durationDays > 0 && _durationDays <= 365, "Durasi harus antara 1-365 hari");

        campaignCounter++;
        uint256 newCampaignId = campaignCounter;
        uint256 deadline = block.timestamp + (_durationDays * 1 days);

        campaigns[newCampaignId] = Campaign({
            id: newCampaignId,
            owner: payable(msg.sender),
            title: _title,
            description: _description,
            category: _category,
            imageUrl: _imageUrl,
            targetAmount: _targetAmount,
            raisedAmount: 0,
            deadline: deadline,
            isActive: true,
            isWithdrawn: false,
            donorCount: 0,
            createdAt: block.timestamp
        });

        campaignIds.push(newCampaignId);
        userCampaignIds[msg.sender].push(newCampaignId);

        emit CampaignCreated(newCampaignId, msg.sender, _title, _targetAmount, deadline);

        return newCampaignId;
    }

    /**
     * @dev Mendapatkan semua kampanye
     */
    function getAllCampaigns() external view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignIds.length);
        for (uint256 i = 0; i < campaignIds.length; i++) {
            allCampaigns[i] = campaigns[campaignIds[i]];
        }
        return allCampaigns;
    }

    /**
     * @dev Mendapatkan detail kampanye
     */
    function getCampaign(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (Campaign memory)
    {
        return campaigns[_campaignId];
    }

    /**
     * @dev Mendapatkan kampanye milik pengguna
     */
    function getUserCampaigns(address _user) external view returns (Campaign[] memory) {
        uint256[] memory ids = userCampaignIds[_user];
        Campaign[] memory userCampaigns = new Campaign[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            userCampaigns[i] = campaigns[ids[i]];
        }
        return userCampaigns;
    }

    // ========== DONATION FUNCTIONS ==========

    /**
     * @dev Melakukan donasi ke kampanye
     */
    function donate(
        uint256 _campaignId,
        string memory _donorName,
        string memory _message
    ) external payable campaignExists(_campaignId) campaignActive(_campaignId) {
        require(msg.value > 0, "Jumlah donasi harus lebih dari 0");

        donationCounter++;
        uint256 newDonationId = donationCounter;

        Campaign storage campaign = campaigns[_campaignId];
        campaign.raisedAmount += msg.value;
        campaign.donorCount++;

        Donation memory newDonation = Donation({
            id: newDonationId,
            campaignId: _campaignId,
            donor: msg.sender,
            donorName: bytes(_donorName).length > 0 ? _donorName : "Anonim",
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1)
        });

        donations[newDonationId] = newDonation;
        campaignDonations[_campaignId].push(newDonation);
        userDonationIds[msg.sender].push(newDonationId);

        emit DonationMade(newDonationId, _campaignId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Mendapatkan semua donasi untuk kampanye tertentu
     */
    function getCampaignDonations(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (Donation[] memory)
    {
        return campaignDonations[_campaignId];
    }

    /**
     * @dev Mendapatkan riwayat donasi pengguna
     */
    function getUserDonations(address _user) external view returns (Donation[] memory) {
        uint256[] memory ids = userDonationIds[_user];
        Donation[] memory userDonationList = new Donation[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            userDonationList[i] = donations[ids[i]];
        }
        return userDonationList;
    }

    /**
     * @dev Mendapatkan total semua donasi di platform
     */
    function getAllDonations() external view returns (Donation[] memory) {
        Donation[] memory allDonations = new Donation[](donationCounter);
        for (uint256 i = 1; i <= donationCounter; i++) {
            allDonations[i - 1] = donations[i];
        }
        return allDonations;
    }

    // ========== WITHDRAWAL FUNCTIONS ==========

    /**
     * @dev Menarik dana kampanye (hanya pemilik kampanye)
     * Mencatat riwayat penarikan untuk transparansi
     */
    function withdrawFunds(uint256 _campaignId)
        external
        campaignExists(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.owner, "Hanya pemilik kampanye");
        require(!campaign.isWithdrawn, "Dana sudah ditarik");
        require(campaign.raisedAmount > 0, "Tidak ada dana untuk ditarik");
        require(
            block.timestamp > campaign.deadline || campaign.raisedAmount >= campaign.targetAmount,
            "Kampanye belum selesai atau target belum tercapai"
        );

        uint256 amount = campaign.raisedAmount;
        campaign.isWithdrawn = true;
        campaign.isActive = false;

        // Catat riwayat penarikan
        withdrawalCounter++;
        uint256 newWithdrawalId = withdrawalCounter;

        withdrawals[newWithdrawalId] = Withdrawal({
            id: newWithdrawalId,
            campaignId: _campaignId,
            campaignTitle: campaign.title,
            recipient: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1)
        });

        withdrawalIds.push(newWithdrawalId);
        campaignWithdrawalId[_campaignId] = newWithdrawalId;

        campaign.owner.transfer(amount);

        emit FundsWithdrawn(_campaignId, msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Mendapatkan semua riwayat penarikan dana
     */
    function getAllWithdrawals() external view returns (Withdrawal[] memory) {
        Withdrawal[] memory allWithdrawals = new Withdrawal[](withdrawalIds.length);
        for (uint256 i = 0; i < withdrawalIds.length; i++) {
            allWithdrawals[i] = withdrawals[withdrawalIds[i]];
        }
        return allWithdrawals;
    }

    /**
     * @dev Mendapatkan riwayat penarikan untuk kampanye tertentu
     */
    function getCampaignWithdrawal(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (Withdrawal memory)
    {
        uint256 wId = campaignWithdrawalId[_campaignId];
        require(wId > 0, "Belum ada penarikan untuk kampanye ini");
        return withdrawals[wId];
    }

    /**
     * @dev Mendapatkan jumlah total penarikan
     */
    function getWithdrawalCount() external view returns (uint256) {
        return withdrawalCounter;
    }

    // ========== STATISTICS FUNCTIONS ==========

    /**
     * @dev Mendapatkan statistik platform
     */
    function getPlatformStats() external view returns (
        uint256 totalCampaigns,
        uint256 totalDonations,
        uint256 totalFundsRaised,
        uint256 activeCampaigns
    ) {
        totalCampaigns = campaignCounter;
        totalDonations = donationCounter;

        uint256 raised = 0;
        uint256 active = 0;
        for (uint256 i = 1; i <= campaignCounter; i++) {
            raised += campaigns[i].raisedAmount;
            if (campaigns[i].isActive && block.timestamp <= campaigns[i].deadline) {
                active++;
            }
        }
        totalFundsRaised = raised;
        activeCampaigns = active;
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @dev Menonaktifkan kampanye (admin)
     */
    function deactivateCampaign(uint256 _campaignId)
        external
        onlyOwner
        campaignExists(_campaignId)
    {
        campaigns[_campaignId].isActive = false;
        emit CampaignDeactivated(_campaignId, block.timestamp);
    }

    /**
     * @dev Mendapatkan jumlah total kampanye
     */
    function getCampaignCount() external view returns (uint256) {
        return campaignCounter;
    }

    /**
     * @dev Mendapatkan jumlah total donasi
     */
    function getDonationCount() external view returns (uint256) {
        return donationCounter;
    }

    /**
     * @dev Mendapatkan saldo kontrak
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ========== FALLBACK ==========

    receive() external payable {}
}
