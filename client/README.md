# NFT Surface - client site

The frontend is built with next.js and is deployable on [Vercel](https://vercel.com/) (recommended), [Netflify](https://www.netlify.com/), etc. 

It can also be run locally using Hardhat. This is highly recommended, to familiarise yourself with the process.

## Deployment

First deploy the smart contract and prepare a catalog (see [smart-contract](/smart-contract) README). Then, in the `client` directory:
```
npm install
npm run dev
```

## Configuration

You will need to amend `clien/.env`. Note that this file doe NOT contain secrets, unlike `smart-contract/.env`. 

```
#catalogFilename = 'catalog_chainid_31337.json'
catalogFilename = 'catalog_chainid_4.json'

# Catalog base directory can either be relative to client/public 
# or a URL path to a remote directory, eg. 'http://example.com/catalog'
catalogBase = '/catalog'

creatorAddress  = '0x72dAd7...'
creatorName     = 'FLOX'
siteTitle       = 'FLOX NFT Catalog'
siteDescription = 'Artworks by FLOX for minting, trading or linking to secondary open NFT marketplaces'
twitterHandle   = '@stephanfowler'

networkKey = 'https://eth-rinkeby.alchemyapi.io/v2/JZzxf4....'
```

The `networkKey` property contains an API key that will be visible in the client. You should configure your blockchain RPC provider to only accept requests from your deployment domain(s).

If using catalog and images hosted on an external URL, in `next.config.js` enable your domain as an image source: 
```
module.exports = {
    env: {
      ...
    },
    images: {
      domains: ['myimages.com'],
    },
  }
  ```

## Status

The client app has been tested against Ethereum testnet (Rinkeby), Polygn testnet (Mumbai), Arbitrum testnet (Rinkeby).
