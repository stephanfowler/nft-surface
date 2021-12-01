# NFT Surface

An NFT platform for minting and selling NFTs with a sovereign Ethereum smart contract. 

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
* Custom Ethereum smart contract, ERC-721 NFT standard
* Adheres to strict NFT provenance best-practice
* SEO-optimised responsive site
* Allows "lazy minting" (offer NFTs without pre-minting them; buyer pays gas to mint)
* Provides links to NFT marketplaces for secondary sales (Opensea, Rarible, ...)
* Re-assignable role for catalog management
* Configurable revenue shares
* Configurable royalty
* Connects to Metamask & compatible Ethereum wallets (desktop)
* Works within Metamask browser (mobile)

See an [example test deployment](https://nft-surface.vercel.app/) on an Ethereum testnet (set your wallet to "Rinkeby Test Network", and [get some test ETH](https://www.google.com/search?q=rinkeby+faucet)).

## Deployment

Deployment consists of the following:

* Deploy a smart contract and create a catalog file using the [smart-contact](/smart-contract/) project.
* Deploy the user-facing site to a suitable host (eg Vercel.com) using the [client](/client/) projects.

It is highly reccomended to first do this a few times on an Ethereum testnet (eg Rinkeby). Ethereum mainnet deploymets are _expensive_.
