# NFT Surface - client site

The frontend is built with next.js and is deployable on [Vercel](https://vercel.com/) (recommended), [Netflify](https://www.netlify.com/), etc.


To run on localhost, first deploy the contract and prepare a catalog (see [smart-contract](/smart-contract) README). Then, in the `client` directory:
```
npm install
npm run dev
```

```
#catalogFilename = 'catalog_chainid_31337.json'
catalogFilename = 'catalog_chainid_4.json'

# Catalog base directory can either be relative to client/public 
# or a URL path to a remote directory, eg. 'http://example.com/catalog'
catalogBase = '/catalog'

creatorAddress  = '0x72dAd71E89a5e4ED46754b0A0fb28Cb6AF721844'
creatorName     = 'FLOX'
siteTitle       = 'FLOX NFT Catalog'
siteDescription = 'Artworks by FLOX for minting, trading or linking to secondary open NFT marketplaces'
twitterHandle   = '@stephanfowler'

networkKey = 'https://eth-rinkeby.alchemyapi.io/v2/JZzxLi6MDK2NoxcNmEC7DNDdwICaMxkf'
```


If using images hosted on an external URL, In `next.config.js`, set your catalog json URL and images base URL, not forgetting to enable your domain as an image source: 
```
module.exports = {
    env: {
      catalogUrl:       'http://stephanfowler.com/nft-agent-assets/catalog_chainid_4.json',
      catalogImages:    'http://stephanfowler.com/nft-agent-assets/images',
      ...

    },
    images: {
      domains: ['stephanfowler.com'],
    },
  }
  ```

## Status

Client has been tested extensively against Rinkeby testnet.
