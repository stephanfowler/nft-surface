require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');

const { OWNER_PRIVATE_KEY, RINKEBY_API_URL, ETHERSCAN_API_KEY } = process.env;

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

/**
 * Summary. Deploy the smart contract
 * Description. Deploys the contract using constructor arguments defined by the specified module (and runs a signature test against it)
 * @example npx hardhat deploy --args ./delpoyment_args_localhost.js --network localhost 
 */
task("deploy", "Deploys the contract using constructor arguments defined by the specified module (and runs a signature test against it)")
  .addParam("args", "Relative path to the arguments module")
  .setAction(async (args, hre) => {
    const deploymentArgs = require(args.args);
    const [deployer] = await ethers.getSigners();
    const NFTagent = await ethers.getContractFactory('NFTagent');
    const contract = await NFTagent.deploy(...deploymentArgs);
    await contract.deployed();    

    const contractAddress = contract.address;
    const { chainId } = await ethers.provider.getNetwork();
    const signatureTestSuccess = await hre.run('sign', {
      wei: "1000",
      id: 123,
      uri: "ipfs://foo.bar/123",
      contract: contractAddress,
      quiet: true
    });

    console.log('Contract deployed:')
    console.log({
      contractAddress,
      chainId,
      signatureTestSuccess
    });  
  });


/**
 * Summary. Generates a signature
 * Description. Generates a signature for the 'mint' contract method
 * @example npx hardhat sign --network localhost --wei 1000 --id 123 --uri ipfs://foo.bar/123 --contract 0xe7f17...etc 
 */
task("sign", "Generates a signature, for the 'mint' contract method")
  .addParam("wei", "The price in wei of the NFT", undefined, types.string)
  .addParam("id", "The intended tokenId of the NFT", undefined, types.int)
  .addParam("uri", "The intended tokenURI of the NFT", undefined, types.string)
  .addParam("contract", "The contract address", undefined, types.address)
  .addOptionalParam("quiet", "Suppress all output", false, types.boolean)
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
      !args.quiet && console.log({
        weiPrice,
        tokenId,
        tokenURI,
        signature
      });
      return true;

    } catch(e) {
      const kmownError = "signature invalid or signer unauthorized";
      if(e.message.includes(kmownError)) {
        !args.quiet && console.log(kmownError);
      } else {
        !args.quiet && console.log(e.message);
      }
      return false;
    }
  });


