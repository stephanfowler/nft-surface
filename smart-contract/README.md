# NFT Surface - smart contract

Built using Hardhat and ethers.js

## Configuration

### Contract constructor

The smart contract requires the following contract constructor arguments for deployment. These are specified in the relevant deployment_args-*.js file (depending on the network you are deploying to):

```
* "Andy Warhol"        // ERC721 name
* "WRHL"               // ERC721 symbol
* "0x1234…"            // admin role address
* "0x4567…"            // agent role address
* ["0x987…", "0x654…"] // PaymentSplitter payees array
* [85, 15]             // PaymentSplitter shares array
* 495                  // Royalty basis points, eg. 495 is 4.95%
```

### Environment variables

Expects the below `.env` file in the directory `smart-contract`. IMPORTANT: this file contains secrets and is referenced in `.gitignore`)

```
# For the "deploy" task, private key of the contract deployer, who is ideally also the creator (see below). For "catalog" or "sign" tasks following a deploy, private key of "agent" role.
SIGNER_PRIVATE_KEY = "...

# The address of the creator/artist/maker/brand. This is added to the catalog and the metadata files on IPFS. 
CREATOR_ADDRESS    = "..."

# For Rinkeby network deployments 
RINKEBY_API_URL    = "..."

# For Mainnet network deployments 
MAINNET_API_URL    = "..."

# For verifying contracts on Etherscan (mainnets and testnets on Etherem/Polygon/...) 
ETHERSCAN_API_KEY  = "..."

# For NFT metadata and image uploads
PINATA_API_KEY     = "..."
PINATA_API_SECRET  = "..."
```

## Installation
```
npm install
npx hardhat test
```

## Contract deployment and catalog management

The following additional Hardhat tasks are provided by the project:

 * __deploy__ : Deploys the contract using constructor arguments in the specified file (and runs a signature test against the contract)
 *  __sign__ : Generates a signature for the lazy 'mint' contract method, and tests it against the deployed contract
  * __catalog__ : Given a json catalog file, automatically manages IPFS metadata and image uploads, lazy-minting signatures, etc.

For usage, do `npx hardhat help deploy`, etc.

The following examples illustrate usage on the Rinkeby testnet.

### Deploy
```
npx hardhat deploy --args ./delpoyment_args_testnet.js --network rinkeby 
```

### Signature test
```
npx hardhat sign --wei 1000 --id 123 --uri ipfs://foo.bar/123 --contract <DEPLOYED_CONTRACT_ADDRESS>  --network rinkeby
```

### Verify on Etherscan (or Polygonscan)
```
npx hardhat verify --network rinkeby --constructor-args delpoyment_args_testnet.js <DEPLOYED_CONTRACT_ADDRESS>
```
Contract validation uses hardhat-etherscan, which expects the property `ETHERSCAN_API_KEY` in the `.env` file in the case of both Etherscan and Polygonscan. These are however distinct APIs so require distinct values; apply for an API key from the relevant one.

### Catalog preparation
```
npx hardhat catalog --network rinkeby --contract <DEPLOYED_CONTRACT_ADDRESS>  
```

The catalog is defined in a json file located by default in `client/public/catalog`. You may specify a different location including a remote one. 

Images are always expected to be in the `images` subdirectory of the catalog directory.

In this json file, manually provide the basic data for each NFT; see an example catalog item below. These should be added in display order to the `NFTs` JSON array in the file. This is enhanced in-file by the `catalog` task, which automatically manages IPFS metadata/image uploads, image measurement, web image optimisation, signatures to enable lazy-minting - and adds these relevant properties to the NFTs' manually-entered properties.  

Importantly, there is a specific catalog file _for each network_ that you choose to deploy to (ie. localhost, testnets such as Rinkeby, and Mainnet). The json file names are differentiated by the integer ["chainid"](https://besu.hyperledger.org/en/stable/Concepts/NetworkID-And-ChainID/) of the network, according to this form:
```
catalog_chainid_<chainid of the network>.json
```
For example, `catalog_chainid_1.json` for Mainnet, `catalog_chainid_4.json` for Rinkeby, etc. Note that the Hardhat local network has a chainId of 31337. 

### Catalog examples

Enter the definition of each NFT as follows, in the catalog file's `NFTs` array:
```
{
    "tokenId": 603,
    "weiPrice": "10000000000000000",
    "sourceImage": "images/gloopy_crowd.jpg",
    "metadata": {
        "name": "Gloopy Crowd",
        "description": "Florence and Stephan Fowler 2021"
        "external_url": "https://gloopies.art/"
    }
}
```
IMPORTANT: IT IS UP TO YOU to specify tokenIds. The `catalog` task will help by disallowing tokenId duplicates within the `catalog.json` file, tokenId omissions, tokenId non-integers, an will not add signature to tokens that are already minted/burnt. 

All `sourceImage` paths must be relative to `images` directory. Arbitrary other properties can be added (e.g. `collection` ...) for the purpose of rendering or additional provenance mechanisms.

The following properties will be automatically added by the `catalog` Hardhat task:

* `tokenURI` - ipfs://hash URI of the metadata uploaded to IPFS by the task
* `metadata.image` - ipfs://hash URI of the `sourceImage` file uploaded to IPFS by the task
* `metadata.width` - the width of `sourceImage`
* `metadata.height` - the height of `sourceImage`
* `webOptimizedImage` - smaller low quality version of `sourceImage` for web display
* `placeholderImage` - tiny blurred version of `sourceImage` for lazy image loading   

* `signature` - if `weiPrice` was specified, a signature is created which enables lazy minting an NFT at that price, having the accompanying `tokenId`, and `tokenURI`  

Example NFT definition after script is run:
```
{
    "tokenId": 603,
    "weiPrice": "10000000000000000",
    "sourceImage": "images/gloopy_crowd.jpg",
    "metadata": {
        "name": "Gloopy Crowd",
        "description": "Florence and Stephan Fowler 2021",
        "external_url": "https://gloopies.art/",
        "image": "ipfs://QmSShS85tNiGQfY3G3mPW2Yv2w1w8wdDBSkXdG1kikS6Mf",
        "width": 1883,
        "height": 2368
    },
    "placeholderImage": "data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQF ... ",
    "webOptimizedImage": "images/gloopy_crowd_web.jpg",
    "tokenURI": "ipfs://Qma5ysnKpCK1PtaVvGPNc6eCssbftpJzhGykavrFy2izMm",
    "signature": "0x255ad96c61585acb950f9f5014d4c9cd236fcaa1a1bd1943a690966068743ca2286abc5ae ... "
}
```
The `catalog` task also appends the following context information to the catalog json file. This acts as config to the `client` that consumes the catalog. For example:

```
"context": {
		"creatorAddress": "0x72dAd71E ...",
		"contractAddress": "0x1211b395 ...",
		"chainId": 4,
		"royaltyBasisPoints": 495
}
```


## Status

Smart-contact has extensive [test coverage](/smart-contract/test/tests.js).
