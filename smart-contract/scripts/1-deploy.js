const { ethers }  = require('hardhat');

async function main() {
  /*
  Deploy contract:
  [0] owner (deployer)
  [0] admin
  [0] agent
  */

  const [deployer] = await ethers.getSigners();
  const NFTagent = await ethers.getContractFactory('NFTagent');
  const contract = await NFTagent.deploy(
    "Testy McTestface", // name
    "TEST"             // symbol
  );
  await contract.deployed();
  
  /*
  Signature & mintability test
  */  
 
  const address = contract.address;
  const { chainId } = await ethers.provider.getNetwork();

  const weiPrice = 100;
  const tokenId  = 123; 
  const tokenURI = "ipfs://QmdBAfgZD3pvWiuGzBXU2ZyuDN3EDxisiNeeVMPyM2f1MC";

  const signature = await deployer._signTypedData(
    // Domain
    {
      name: 'NFTagent',
      version: '1.0.0',
      chainId: chainId,
      verifyingContract: address,
    },
    // Types
    {
      NFT: [
        { name: 'weiPrice', type: 'uint256' },
        { name: 'tokenId',  type: 'uint256' },
        { name: 'tokenURI', type: 'string' }
      ],
    },
    // Value
    { weiPrice, tokenId, tokenURI },
  );

  const mintableTest = await contract.mintable(weiPrice, tokenId, tokenURI, signature);

  console.log('Contract deployed:')
  console.log({
    address,
    chainId,
    mintableTest
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
