// For 1-deploy,js script.
//
// For verificatioon on etherscan: 
// npx hardhat verify --network rinkeby --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS

module.exports = [
    "Testy McTestface",                              // ERC721 name
    "TEST",                                          // ERC721 symbol
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",    // admin role address
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",    // agent role address
    ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"],  // PaymentSplitter payees array
    [100],                                           // PaymentSplitter shares array
    495                                              // Royalty basis points
];