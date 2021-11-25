Expects `.env` 
```
# For "deploy" task, private key of the contract deployer, who is ideally also the creator (see below),
# For "catalog" or "sign" tasks following deploy, private key of "agent" role
SIGNER_PRIVATE_KEY = "...

# The address of the creator/artist/maker/brand/...
CREATOR_ADDRESS    = "..."

# For Rinkeby network deployments 
RINKEBY_API_URL    = "..."

# For verifying contracts on Etherscan (all public networks) 
ETHERSCAN_API_KEY  = "..."

# For NFT metadata and image uploads
PINATA_API_KEY     = "..."
PINATA_API_SECRET  = "..."
```

Install
```
npm install
npx hardhat test
```

Deploy
```
npx hardhat deploy --args ./delpoyment_args_localhost.js --network localhost|rinkeby|...
```

Signature test
```
npx hardhat sign --wei 1000 --id 123 --uri ipfs://foo.bar/123 --contract 0xe7f17...  --network localhost|rinkeby|...
```

Verify on Etherscan
```
npx hardhat verify --network rinkeby --constructor-args delpoyment_args_rinkeby.js DEPLOYED_CONTRACT_ADDRESS
```

Catalog preparation
```
npx hardhat catalog --network localhost --contract 0x5FbDB...  --network localhost|rinkeby|... 
```

See example new catalog item below; these are in display order as a JSON array in `catalog_chainid_<chainid of the network>.json`.

All `sourceImage` paths must be relative to `images` directory. 

```
{
    "tokenId": 603,
    "weiPrice": "10000000000000000",
    "metadata": {
        "name": "Gloopy Crowd",
        "description": "Florence and Stephan Fowler 2021"
        "external_url": "https://gloopies.art/"
    },
    "sourceImage": "gloopy_crowd/big.jpg"
}
```
Arbitary other properties can be added (e.g. `collection` ...) for the purpose of rendering or additional provenance mechanisms.

IMPORTANT: IT IS UP TO YOU to specify tokenIds. The `3-prepare-catalog.js` script will help by disallowing tokenId duplicates within the `catalog.json` file, tokenId omissions, tokenId non-integers, and will set `status` approriately if the tokenId is already minted/burnt. 

Added by the script:

* `tokenURI` 

* `metadata.image`, `metadata.width`, `metadata.width`, `placeholderImage`; the first is the hash URI of `sourceImage` which is auomatically uploaded to IPFS.

* If you specified `weiPrice`, then `signature` and `status: "mintable"` are added 

* If you did NOT specify `weiPrice`, then `status: "withheld"` will be added. Note that the computed tokenURI will be useful to an authorised user if minting the NFT directly using the mint() contract method.

Example after script is run:
```
{
    "tokenId": 603,
    "weiPrice": "10000000000000000",
    "metadata": {
        "name": "Gloopy Crowd",
        "description": "Florence and Stephan Fowler 2021",
        "external_url": "https://gloopies.art/",
        "image": "ipfs://QmSShS85tNiGQfY3G3mPW2Yv2w1w8wdDBSkXdG1kikS6Mf",
        "width": 1883,
        "height": 2368
    },
    "sourceImage": "gloopy_crowd/big.jpg",
    "placeholderImage": "data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQF ... ",
    "tokenURI": "ipfs://Qma5ysnKpCK1PtaVvGPNc6eCssbftpJzhGykavrFy2izMm",
    "signature": "0x255ad96c61585acb950f9f5014d4c9cd236fcaa1a1bd1943a690966068743ca2286abc5ae ... ",
    "status": "claimable"
}

```

If a later run of the script detects that an item has been minted or burnt, the `signature` is deleted and `status` is updated to `minted|burnt`:
```
{
    "tokenId": 603,
    "metadata": {
        "name": "Gloopy Crowd",
        "description": "Florence and Stephan Fowler 2021",
        "external_url": "https://gloopies.art/",
        "image": "ipfs://QmSShS85tNiGQfY3G3mPW2Yv2w1w8wdDBSkXdG1kikS6Mf",
        "width": 1883,
        "height": 2368
    },
    "sourceImage": "gloopy_crowd/big.jpg",
    "placeholderImage": "data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQF ... ",
    "tokenURI": "ipfs://Qma5ysnKpCK1PtaVvGPNc6eCssbftpJzhGykavrFy2izMm",
    "status": "minted"
}
```

Example output from running script:
```
{
  name: 'NFTagent',
  version: '1.0.0',
  chainId: 4,
  verifyingContract: '0xb5480D2A4D15b09103442 ... '
}
{
  idsNewlyMinted: [603],
  idsNewlyBurnt: [],
  idsSigned: [ 602, 601 ],
  idsWithheld: [ 600 ],
  idsUploadImage: [ 602, 601, 600 ],
  idsUploadMetadata: [ 602, 601, 600 ]
}
```

[Last testnet deployment](https://rinkeby.etherscan.io/address/0xb5480D2A4D15b091034426043d17F2fa53ae2156#code)
