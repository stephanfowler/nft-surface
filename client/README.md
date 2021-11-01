# NFT Agent

NFT catalog and minting site 

```
npm install
npm run dev
```

In `next.config.js`, set your catalog json URL and images base URL, not forgetting to enable your domain as an image source: 
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