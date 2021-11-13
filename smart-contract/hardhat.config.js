require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');

const { OWNER_PRIVATE_KEY, RINKEBY_API_URL, ETHERSCAN_API_KEY } = process.env;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// Use:
// npx hardhat sign --network localhost --wei 0 --id 123 --uri ipfs://foo.bar/123 --contract 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
//
task("sign", "Generates a signature for the 'mint' contract method")
  .addParam("wei", "The price in wei of the NFT", undefined, types.string)
  .addParam("id", "The intended tokenId of the NFT", undefined, types.int)
  .addParam("uri", "The intended tokenURI of the NFT", undefined, types.string)
  .addParam("contract", "The contract address", undefined, types.address)
  .setAction(async (args) => {
    const weiPrice = args.wei;
    const tokenId = args.id;
    const tokenURI = args.uri;
    const contractAddress = args.contract;

    if (!ethers.utils.isAddress(contractAddress)) {
      console.log("Error: invalid address value for contract")
      return;
    }

    const [defaultAcc] = await ethers.getSigners();
    const NFTagent = await ethers.getContractFactory('NFTagent');
    const contract = await NFTagent.attach(contractAddress);
    const { chainId } = await ethers.provider.getNetwork();

    const signature = await defaultAcc._signTypedData(
      {
        name: 'NFTagent',
        version: '1.0.0',
        chainId: chainId,
        verifyingContract: contractAddress,
      },
      {
        NFT: [
          { name: 'weiPrice', type: 'uint256' },
          { name: 'tokenId',  type: 'uint256' },
          { name: 'tokenURI', type: 'string' }
        ],
      },
      { weiPrice, tokenId, tokenURI },
    );

    try {
      const isMintable = await contract.mintable(weiPrice, tokenId, tokenURI, signature);
      console.log({
        weiPrice,
        tokenId,
        tokenURI,
        signature
      });
    } catch(e) {
      const kmownError = "signature invalid or signer unauthorized";
      if(e.message.includes(kmownError)) {
        console.log(kmownError);
      } else {
        console.log(e.message);
      }
    }
  });


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
     hardhat: {},
     rinkeby: {
        url: RINKEBY_API_URL,
        accounts: [`0x${OWNER_PRIVATE_KEY}`]
     }
  },  
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  solidity: {
    version: "0.8.2",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  }
};
