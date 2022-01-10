// For 1-deploy,js script.
//
// For verificatioon on etherscan: 
// npx hardhat verify --network rinkeby --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS

module.exports = [
    "Testy McTestface",                              // ERC721 name
    "TEST",                                          // ERC721 symbol
    "0x72dAd71E89a5e4ED46754b0A0fb28Cb6AF721844",    // admin role address
    "0x72dAd71E89a5e4ED46754b0A0fb28Cb6AF721844",    // agent role address
    ["0x72dAd71E89a5e4ED46754b0A0fb28Cb6AF721844"],  // PaymentSplitter payees array
    [100],                                           // PaymentSplitter shares array
    495                                              // Royalty basis points
];