# NFT Surface

## White-label NFT gallery

* Showcase, mint, sell, buy, and transfer NFTs
* ERC-721 smart contract
* Adheres to strict [NFT provenance best-practices](https://link.medium.com/LJjFKB999lb)
* SEO optimised responsive site
* Allows "lazy minting" (offer NFTs without pre-minting them; buyer pays gas to mint)
* Shows links to Opensea & Rarible for secondary sales
* Re-assignable role for catalog management
* Configurable revenue shares
* Configurable royalty
* Deployable on any EVM blockchain (Ethereum, Polygon, Arbitrum, etc)

See example deployments on these testnets:
- [Ethereum (Rinkeby testnet)](https://nft-surface.vercel.app/)
- [Polygon (Mumbai testnet)](https://nft-surface-polygon.vercel.app/)
- [Arbitrum (Rinkeby testnet)](https://nft-surface-arbitrum.vercel.app/)

To interact with these you'll need a [Metamask](https://metamask.io/) wallet and some relevant test currency (eg. Google "Rinkeby faucet").

### Example front page:

![NFT display/minting page](/docs/front.png?raw=true "NFT display/minting page")

### Example catalog page:

![NFT gallery page](/docs/catalog.png?raw=true "NFT gallery page")

### Example NFT item page:

![NFT display/minting page](/docs/nft.png?raw=true "NFT display/minting page")

### Video

View [a screen recording](https://photos.google.com/share/AF1QipOCXujeQ6RovqSewodsY6nSk4Sa46eViRzjjlekzoxDEMJ9-VZbCPjeBj7UFQnIvw/photo/AF1QipMyCD13dLabWzr23UmUROluZzrTa6Z16r3UB8si?key=YnJpTFJ4bThOVzVVOFd6aHplN1VHOXBlTVRfenhB) of NFT Surface [Music credits: Eric Le Lann & Stephan Fowler]

## Deployment

* Deploy the smart contract and create a catalog file. [more...](/smart-contract/)
* Deploy the user-facing client application to a suitable host (eg Vercel.com). [more...](/client/)

Try this a few times first on a relevant testnet! Mainnet deployments are _expensive_.

## Chain support

The repo currently has the details for these chains:
* Ethereum Mainnet
* Ethereum Rinkeby Testnet
* Polygon Testnet
* Arbitrum Rinkeby Testnet

To add other chains, add their details in the following files, following the pattern for the already-implemented chains:
```
client/utils/chain-spec.js
smart-contract/hardhat.config.js
smart-contract/.env
```
You'll also need a chain-specific catalog file (see [smart-contact](/smart-contract/)).
