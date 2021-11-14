https://testnets.opensea.io/assets/<contractAddress>/603

module.exports = {
    env: {
      catalogBase:      process.env.catalogBase,
      catalogFilename:  process.env.catalogFilename,

      creatorName:      'FLOF',
      siteTitle:        'FLOF NFT Catalog',
      siteDescription:  'NFT works by FLOF for minting or secondary trading on open NFT marketplaces',
      twitterHandle:    '@stephanfowler',

      etherscanAddress: 'https://rinkeby.etherscan.io/address/<address>',
      etherscanToken:   'https://rinkeby.etherscan.io/token/<address>?a=<tokenId>',
      etherscanTx:      'https://rinkeby.etherscan.io/tx/<hash>',
      etherscanBlock:   'https://rinkeby.etherscan.io/block/<number>',
      openseaAsset:     'https://testnets.opensea.io/assets/<address>/<tokenId>',
      raribleAsset:     'https://rinkeby.rarible.com/token/<address>:<tokenId>',
      ipfsGateway:      'https://gateway.pinata.cloud/ipfs/<ipfsHash>'
    },
    images: {
      domains: ['stephanfowler.com'],
    },
  }