// For 1-deploy,js script.
//
// For verificatioon on etherscan: 
// npx hardhat verify --network rinkeby --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS

module.exports = [
    "Testy McTestface",                              // ERC721 name
    "TEST",                                          // ERC721 symbol
    495                                              // Royalty basis points
];