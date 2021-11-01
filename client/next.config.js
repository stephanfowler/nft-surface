https://testnets.opensea.io/assets/<contractAddress>/603

module.exports = {
    env: {
      catalogUrl:       'http://stephanfowler.com/nft-agent-catalog/catalog_chainid_4.json',
      catalogImages:    'http://stephanfowler.com/nft-agent-catalog/images',
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