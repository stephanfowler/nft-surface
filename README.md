# NFT minter and gallery

## Item page:

![NFT display/minting page](/docs/images/nft-agent-01.png?raw=true "NFT display/minting page")

## Gallery page:

![NFT gallery page](/docs/images/nft-agent-02.png?raw=true "NFT gallery page")

## Description

Deploys an NFT smart contract (ERC721 standard) and an SEO-optimised site to showcase and offer minting of NFTs.

* Adheres to strict NFT provenance best-practices
* Lazy minting (add NFTs to catalog without pre-minting them)
* Assignable roles for managing the catalog
* Configurable revenue shares for multiple accounts

See an [example test deployment](https://nft-agent.vercel.app/).

## Deployment notes

The [smart contract](/nft-agent/blob/main/smart-contract/contracts/NFTagent.sol) requires six deployment arguments:

* "Andy Warhol",          // ERC721 name
* "WRHL",                 // ERC721 symbol
* "0x1E89…",              // admin role address
* "0x1E89…",              // agent role address
* ["0x8Cb6", "0x72dA…"],  // PaymentSplitter payees array
* [85, 15]                // PaymentSplitter shares array

The frontend site is built with next.js and is deployable on [Vercel](https://vercel.com/) (recommended), [Netflify](https://www.netlify.com/), etc.

See the separate READMEs for [smart-contact](/nft-agent/blob/main/smart-contract/) and [client](/nft-agent/blob/main/client/).

## Status

Tested extensively on Rinkeby.
