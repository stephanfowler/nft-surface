# NFT minter and gallery

## Item page:

![NFT display/minting page](/docs/images/nft-agent-01.png?raw=true "NFT display/minting page")

## Gallery page:

![NFT gallery page](/docs/images/nft-agent-02.png?raw=true "NFT gallery page")

## Description

Deploys an NFT smart contract (ERC721 standard) and an SEO-optimised responsive site to showcase and mint NFTs.

* Adheres to NFT provenance best-practices
* Lazy minting (add NFTs to catalog without pre-minting them)
* Re-assignable agent role for managing the catalog
* Configurable revenue shares for multiple accounts

See an [example test deployment](https://nft-agent.vercel.app/) on an Ethereum testnet (set your wallet to "Rinkeby Test Network").

## Deployment notes

The [smart contract](/smart-contract/contracts/NFTagent.sol) requires six deployment arguments:

```
* "Andy Warhol"          // ERC721 name
* "WRHL"                 // ERC721 symbol
* "0x1E89…"              // admin role address
* "0x1E89…"              // agent role address
* ["0x8Cb6", "0x72dA…"]  // PaymentSplitter payees array
* [85, 15]               // PaymentSplitter shares array
```

The frontend site is built with next.js and is deployable on [Vercel](https://vercel.com/) (recommended), [Netflify](https://www.netlify.com/), etc.

See READMEs for the separate [smart-contact](/smart-contract/) and [client](/client/) projects.

## Status

Smart-contact has extensive [test coverage](/smart-contract/test/tests.js).
Client has been tested extensively against Rinkeby.
