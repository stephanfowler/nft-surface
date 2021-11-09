const { ethers }  = require('hardhat');

async function main() {
  /*
  Generate a signature
  */

  const address = process.env.CONTRACT_ADDRESS;

  const tokenId  = 456;
  const weiPrice = '10000000000000000';
  const tokenURI = "ipfs://Qmf5jGkhrstazDfRLPVeJb4YsRRq8YikHhxELHVMVrFpCq";

  const [defaultAcc] = await ethers.getSigners();
  const NFTagent = await ethers.getContractFactory('NFTagent');
  const contract = await NFTagent.attach(address);

  const { chainId } = await ethers.provider.getNetwork();

  const signature = await defaultAcc._signTypedData(
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

  console.log('Signature spec:')
  console.log({
    weiPrice,
    tokenId,
    tokenURI,
    signature
  });

  const mintableTest = await contract.mintable(weiPrice, tokenId, tokenURI, signature);

  console.log('\nTests:')
  console.log({
    mintableTest
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
