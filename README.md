# NFT Surface

An NFT platform for minting and selling NFTs with a sovereign ERC721 smart contract, for EVM blockchains (Ethereum, Polygon, ...) 

### Example front page:

![NFT display/minting page](/docs/front.png?raw=true "NFT display/minting page")

### Example catalog page:

![NFT gallery page](/docs/catalog.png?raw=true "NFT gallery page")

### Example NFT item page:

![NFT display/minting page](/docs/nft.png?raw=true "NFT display/minting page")

### Video

View [a screen recording](https://photos.google.com/share/AF1QipOCXujeQ6RovqSewodsY6nSk4Sa46eViRzjjlekzoxDEMJ9-VZbCPjeBj7UFQnIvw/photo/AF1QipMyCD13dLabWzr23UmUROluZzrTa6Z16r3UB8si?key=YnJpTFJ4bThOVzVVOFd6aHplN1VHOXBlTVRfenhB) of NFT Surface [Music credits: Eric Le Lann & Stephan Fowler]

## Description

* Showcase, mint, sell, buy, and transfer NFTs
* Custom smart contract, ERC-721 NFT standard
* Adheres to strict NFT provenance best-practice
* SEO-optimised responsive site
* Allows "lazy minting" (offer NFTs without pre-minting them; buyer pays gas to mint)
* Provides links to NFT marketplaces for secondary sales (Opensea, Rarible, ...)
* Re-assignable role for catalog management
* Configurable revenue shares
* Configurable royalty
* Connects to Metamask or compatible wallet (desktop)
* Works within Metamask browser (mobile)

See example deployments of NFT Surface on these testnets:
- [Ethereum (Rinkeby testnet)](https://nft-surface.vercel.app/)
- [Polygon (Mumbai testnet)](https://nft-surface-polygon.vercel.app/)
- [Arbitrum (Rinkeby testnet)](https://nft-surface-arbitrum.vercel.app/)

To interact with these you'll need a [Metamask](https://metamask.io/) wallet (to which you may need to add the relevant [testnet details](https://chainlist.org/)) and some relevant test currency (eg. Google "Rinkeby faucet").

## Deployment

Deployment consists of the following:

* Deploy a smart contract and create a catalog file using the [smart-contact](/smart-contract/) project.
* Deploy the user-facing site to a suitable host (eg Vercel.com) using the [client](/client/) projects.

It is highly reccomended to try this a few times first on a testnet! Mainnet deploymets are _expensive_.

## Chain support

The repo currently has support for these chainIDs:
* 1 - Ethereum Mainnet
* 4 - Rinkeby Testnet
* 137 - Polygon Mainnet
* 80001 - Polygon Testnet
* 421611 - Arbitrum Testnet

To add other chains, add their details in these files, following the pattern for the existing chains:
```
smart-contract/.env
smart-contract/hardhat.config.js
client/utils/chain-spec.js
```
Also add a `client/public/catalog/catalog_chainid_<your new chain id>.json` (see [smart-contact](/smart-contract/)).