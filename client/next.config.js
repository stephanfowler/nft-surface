https://testnets.opensea.io/assets/<contractAddress>/603

module.exports = {
    env: {
      networkKey:       process.env.networkKey,
      catalogBase:      process.env.catalogBase,
      catalogFilename:  process.env.catalogFilename,
			creatorAddress:   process.env.creatorAddress,
      creatorName:      process.env.creatorName,
      siteTitle:        process.env.siteTitle,
      siteDescription:  process.env.siteDescription,
      twitterHandle:    process.env.twitterHandle,

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
    target: 'serverless'
  }