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

See example deployments on these testnets: 
- [Ethereum testnet](https://nft-surface.vercel.app/) (set your Metamask wallet to "Rinkeby Test Network" and [get some test ETH](https://www.google.com/search?q=rinkeby+faucet)). 
- [Polygon testnet](https://nft-surface-1yq9h1kix-stephanfowler.vercel.app/) (first [add Mumbai Testnet](https://docs.polygon.technology/docs/develop/metamask/config-polygon-on-metamask/) to your Metamask wallet, switch to it, and [get some test MATIC](https://www.google.com/search?q=mumbai+faucet)) 

## Deployment

Deployment consists of the following:

* Deploy a smart contract and create a catalog file using the [smart-contact](/smart-contract/) project.
* Deploy the user-facing site to a suitable host (eg Vercel.com) using the [client](/client/) projects.

It is highly reccomended to try this a few times first on a testnet! Mainnet deploymets are _expensive_.
