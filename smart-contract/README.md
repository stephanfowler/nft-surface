# NFT Surface - smart contract

Built using Hardhat and ethers.js

Adds the following Hardhat tasks:

 * __deploy__ : Deploys the contract using constructor arguments in the specified file (and runs a signature test against the contract)
 *  __sign__ : Generates a signature for the 'mint' contract method, and tests it against the deployed contract
  * __catalog__ : Given a json catalog file, automatically manages IPFS metadata and image uploads, lay-minting signatures, etc 

For usage, do `npx hardhat help deploy`, etc

The smart contract requires the following deployment arguments, specified in the relevant deployment_args-*.js file:

```
* "Andy Warhol"        // ERC721 name
* "WRHL"               // ERC721 symbol
* "0x1234…"            // admin role address
* "0x4567…"            // agent role address
* ["0x987…", "0x654…"] // PaymentSplitter payees array
* [85, 15]             // PaymentSplitter shares array
* 495                  // Royalty basis points, eg. 495 is 4.95%
```

Expects `.env` 
```
# For the "deploy" task, private key of the contract deployer, who is ideally also the creator (see below). For "catalog" or "sign" tasks following a deploy, private key of "agent" role.
SIGNER_PRIVATE_KEY = "...

# The address of the creator/artist/maker/brand. This is added to the catalog and the metadata files on IPFS. 
CREATOR_ADDRESS    = "..."

# For Rinkeby network deployments 
RINKEBY_API_URL    = "..."

# For Mainnet network deployments 
MAINNET_API_URL    = "..."

# For verifying contracts on Etherscan (all public networks) 
ETHERSCAN_API_KEY  = "..."

# For NFT metadata and image uploads
PINATA_API_KEY     = "..."
PINATA_API_SECRET  = "..."
```

## Install
```
npm install
npx hardhat test
```

## Deployment and management

The following additional Hardhat tasks are provided:

 * __deploy__ : Deploys the contract using constructor arguments in the specified file (and runs a signature test against the contract)
 *  __sign__ : Generates a signature for the 'mint' contract method, and tests it against the deployed contract
  * __catalog__ : Given a json catalog file, automatically manages IPFS metadata and image uploads, lay-minting signatures, etc.

For usage, do `npx hardhat help deploy`, etc


### Deploy
```
npx hardhat deploy --args ./delpoyment_args_localhost.js --network localhost 
```

### Signature test
```
npx hardhat sign --wei 1000 --id 123 --uri ipfs://foo.bar/123 --contract 0xe7f17...  --network localhost|rinkeby|...
```

### Verify on Etherscan
```
npx hardhat verify --network rinkeby --constructor-args delpoyment_args_rinkeby.js DEPLOYED_CONTRACT_ADDRESS
```

### Catalog preparation
```
npx hardhat catalog --network localhost --contract 0x5FbDB...  --network localhost|rinkeby|... 
```

The catalog is expressed in a json file. By defaut these are in `client/public/catalog`, but you may specify a different location including a remote one. 

__Images__ are always expected to be in the `images` subdirectoty of the specified catalog directory.

In this json file, you need to provide basic data regarding each NFT. See an example new catalog item below. These should be added in intended display order to the `NFTs` JSON array in the file. This data is enhanced in-file by the `catalog` task, which automatically manages IPFS metadata/image uploads, image measurment, image optimisation for web display, lay-minting signatures, etc.  

Importantly, there is a specifi catalog file _+_per network_ that you deploy to (ie. localhost, testnets such as Rinkeby, and Mainnet). The filenames are differentoated by the integer ["chainid"](https://besu.hyperledger.org/en/stable/Concepts/NetworkID-And-ChainID/) of the network, according to this form:
```
catalog_chainid_<chainid of the network>.json
```
For example, `catalog_chainid_1.json` for Mainnet, `catalog_chainid_4.json` for Rinkeby, etc. Note that the hardhat local network has a chainId of 31337. 

### Catalog examples

All `sourceImage` paths must be relative to `images` directory. 

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
Arbitary other properties can be added (e.g. `collection` ...) for the purpose of rendering or additional provenance mechanisms.

IMPORTANT: IT IS UP TO YOU to specify tokenIds. The `3-prepare-catalog.js` script will help by disallowing tokenId duplicates within the `catalog.json` file, tokenId omissions, tokenId non-integers, and will set `status` approriately if the tokenId is already minted/burnt. 

Added by the script:

* `tokenURI` 

* `metadata.image`, `metadata.width`, `metadata.width`, `webOptimizedImage` and `placeholderImage`; the first is the IPFS hash URI of `sourceImage` which is auomatically uploaded to IPFS.

* If you specified `weiPrice`, then `signature` is added 

Example after script is run:
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
## Status

Smart-contact has extensive [test coverage](/smart-contract/test/tests.js).
