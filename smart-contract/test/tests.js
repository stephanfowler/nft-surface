const { ethers } = require('hardhat');
const { expect } = require('chai')
const keccak256 = require('keccak256');

const weiPrice = ethers.utils.parseEther("1");
const tokenId = 123;
const tokenURI = "ipfs://123456789";

const salePrice = ethers.utils.parseEther("2");
const royaltyBasisPoints = 499; // = 4.99%

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const AGENT_ROLE         = `0x${keccak256('AGENT_ROLE').toString('hex')}`

beforeEach(async function() {
  /*
  Deploy contract:
  [0] owner (deployer)
  [1] admin
  [2] agent
  */
 
  this.accounts = await ethers.getSigners();
  ({ chainId: this.chainId } = await ethers.provider.getNetwork());

  const NFTagent = await ethers.getContractFactory('NFTagent');

  this.contract = await NFTagent.deploy(
    "Test",
    "TST",
    this.accounts[1].address,
    this.accounts[2].address,
    [this.accounts[0].address, this.accounts[1].address],
    [85,15]
  );

  await this.contract.deployed();

  this.provider = ethers.provider;

  this.sigDomain = {
    name: 'NFTagent',
    version: '1.0.0',
    chainId: this.chainId,
    verifyingContract: this.contract.address,
  };

  this.sigTypes = {
    NFT: [
      { name: 'weiPrice', type: 'uint256' },
      { name: 'tokenId',  type: 'uint256' },
      { name: 'tokenURI', type: 'string' }
    ]
  };
});

// nb, use...
// expect(await  ... for read functions succeeding
// await expect( ... for read functions failing, and all write functions


it('setPrice, buy', async function () {
  const startingBalance4 = await this.accounts[4].getBalance();

  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [3] attempt setPrice
  await expect(this.contract.connect(this.accounts[3]).setPrice(tokenId, salePrice))
  .to.be.revertedWith('caller is not token owner');

  // [3] attempt buy
  await expect(this.contract.connect(this.accounts[3]).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');

  // [4] setPrice
  await expect(this.contract.connect(this.accounts[4]).setPrice(tokenId, salePrice))
  .to.emit(this.contract, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [4] attempt buy, is already owner
  await expect(this.contract.connect(this.accounts[4]).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('caller is token owner');

  // [3] attempt buy, insufficient value
  await expect(this.contract.connect(this.accounts[3]).buy(tokenId, {value: ethers.BigNumber.from(salePrice).sub(1)}))
  .to.be.revertedWith('insufficient ETH sent');

  // [3] price
  expect(await this.contract.connect(this.accounts[3]).price(tokenId))
  .to.equal(salePrice);  

  const startingBalance3 = await this.accounts[3].getBalance();

  // [3] buy
  await expect(this.contract.connect(this.accounts[3]).buy(tokenId, {value: salePrice}))
  .to.emit(this.contract, 'Bought')
  .withArgs(tokenId, this.accounts[3].address);

  const closingBalance3 = await this.accounts[3].getBalance()
  const closingBalance4 = await this.accounts[4].getBalance();

  // [4] price
  expect(await this.contract.connect(this.accounts[4]).price(tokenId))
  .to.equal(0);  

  // [4] attempt setPrice
  await expect(this.contract.connect(this.accounts[4]).setPrice(tokenId, salePrice))
  .to.be.revertedWith('caller is not token owner');

  // [3] ownerOf
  expect(await this.contract.connect(this.accounts[3]).ownerOf(tokenId))
  .to.equal(this.accounts[3].address);

  // [2] attempt buy
  await expect(this.contract.connect(this.accounts[4]).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');

  // gas fee make the closing balances inexact, so need to rely on gt/lt
  expect(closingBalance3.lt(startingBalance3.sub(salePrice)))
  .to.equal(true);

  expect(closingBalance4.gt(startingBalance4)
      && closingBalance4.lt(startingBalance4.add(salePrice)))
  .to.equal(true);
});


it('setRoyalty', async function () {
  // [4] attempt setRoyalty
  await expect(this.contract.connect(this.accounts[4]).setRoyalty(royaltyBasisPoints))
  .to.be.revertedWith('unauthorized to set royalty');

  // [2] attemt setRoyalty, too high
  await expect(this.contract.connect(this.accounts[2]).setRoyalty(10001))
  .to.be.revertedWith('cannot exceed 10000 basis points');

  // [2] setRoyalty
  await expect(this.contract.connect(this.accounts[2]).setRoyalty(royaltyBasisPoints))
  .to.emit(this.contract, 'RoyaltySet')
  .withArgs(royaltyBasisPoints);

  // [2] mintAuthorized for [4]
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [4] setPrice
  await expect(this.contract.connect(this.accounts[4]).setPrice(tokenId, salePrice))
  .to.emit(this.contract, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [3] buy
  await expect(this.contract.connect(this.accounts[3]).buy(tokenId, {value: salePrice}))
  .to.emit(this.contract, 'Bought')
  .withArgs(tokenId, this.accounts[3].address);

  const balance = await this.provider.getBalance(this.contract.address);
  let ethBalance = ethers.utils.formatEther(balance);
  ethBalance = Math.round(ethBalance * 1e4) / 1e4;

  let expectedRoyalty = ethers.utils.formatEther(salePrice);
  expectedRoyalty = Math.round(expectedRoyalty * 1e6 * royaltyBasisPoints) / (1e10);

  expect(ethBalance)
  .to.equal(expectedRoyalty);
});


it('un-setPrice', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [4] setPrice
  await expect(this.contract.connect(this.accounts[4]).setPrice(tokenId, salePrice))
  .to.emit(this.contract, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [4] setPrice to 0 (remove from sale)
  await expect(this.contract.connect(this.accounts[4]).setPrice(tokenId, 0))
  .to.emit(this.contract, 'PriceSet')
  .withArgs(tokenId, 0);

  // [3] attempt buy
  await expect(this.contract.connect(this.accounts[3]).buy(tokenId, {value: 123456}))
  .to.be.revertedWith('token not for sale');
});


it('setPrice, transfer', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [4] setPrice
  await expect(this.contract.connect(this.accounts[4]).setPrice(tokenId, salePrice))
  .to.emit(this.contract, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [1] price
  expect(await this.contract.connect(this.accounts[1]).price(tokenId))
  .to.equal(salePrice);  

  // [4] transferFrom
  await expect(this.contract.connect(this.accounts[4]).transferFrom(this.accounts[4].address, this.accounts[3].address, tokenId))
  .to.emit(this.contract, 'Transfer')
  .withArgs(this.accounts[4].address, this.accounts[3].address, tokenId);

  // [1] price
  expect(await this.contract.connect(this.accounts[1]).price(tokenId))
  .to.equal(0);

  // [4] attempt buy
  await expect(this.contract.connect(this.accounts[4]).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');
});


it('role assignments', async function () {
  // [0] owner
  expect(await this.contract.connect(this.accounts[4]).owner())
  .to.equal(this.accounts[0].address);

  // [4] hasRole [1]
  expect(await this.contract.connect(this.accounts[4]).hasRole(DEFAULT_ADMIN_ROLE, this.accounts[1].address))
  .to.equal(true);

  // [4] hasRole [2]
  expect(await this.contract.connect(this.accounts[4]).hasRole(AGENT_ROLE, this.accounts[2].address))
  .to.equal(true);
});

it('receiving and withdrawing', async function () {
  const startingBalance0 = await this.accounts[0].getBalance();
  const startingBalance1 = await this.accounts[1].getBalance();

  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [5] send 9 ETH
  await expect(this.accounts[5].sendTransaction({to: this.contract.address, value: ethers.utils.parseEther("9")}))
  .to.emit(this.contract, 'PaymentReceived')
  .withArgs(this.accounts[5].address, ethers.utils.parseEther("9"));

  // totalReceived is now 10 ETH (ie from mint + send)

  // [4] attempt release to [4]
  await expect(this.contract.connect(this.accounts[4]).release(this.accounts[4].address))
  .to.be.revertedWith('PaymentSplitter: account has no shares');

  // [4] release to [0]
  await expect(this.contract.connect(this.accounts[4]).release(this.accounts[0].address))
  .to.emit(this.contract, 'PaymentReleased')
  .withArgs(this.accounts[0].address, ethers.utils.parseEther("8.5")); // 85/100 * 10 ETH

  // [4] attempt repeat release to [0]
  await expect(this.contract.connect(this.accounts[4]).release(this.accounts[0].address))
  .to.be.revertedWith('PaymentSplitter: account is not due payment');

  // [5] send 1 ETH more
  await expect(this.accounts[5].sendTransaction({to: this.contract.address, value: ethers.utils.parseEther("1.0")}))
  .to.emit(this.contract, 'PaymentReceived')
  .withArgs(this.accounts[5].address, ethers.utils.parseEther("1"));

  // [4] release to [0]
  await expect(this.contract.connect(this.accounts[4]).release(this.accounts[0].address))
  .to.emit(this.contract, 'PaymentReleased')
  .withArgs(this.accounts[0].address, ethers.utils.parseEther("0.85")); // 85/100 * 1 ETH

  // [4] release to [1]
  await expect(this.contract.connect(this.accounts[4]).release(this.accounts[1].address))
  .to.emit(this.contract, 'PaymentReleased')
  .withArgs(this.accounts[1].address, ethers.utils.parseEther("1.65")); // 15/100 * 11 ETH

  // [4] attempt repeat release to [1]
  await expect(this.contract.connect(this.accounts[4]).release(this.accounts[1].address))
  .to.be.revertedWith('PaymentSplitter: account is not due payment');

  // [4] released to [0]
  expect(await this.contract.connect(this.accounts[4]).released(this.accounts[0].address))
  .to.equal(ethers.utils.parseEther("9.35")); // 85/100 * 11 ETH

  // [4] released to [1]
  expect(await this.contract.connect(this.accounts[4]).released(this.accounts[1].address))
  .to.equal(ethers.utils.parseEther("1.65"));

  // [4] totalReleased
  expect(await this.contract.connect(this.accounts[4]).totalReleased())
  .to.equal(ethers.utils.parseEther("11"));

  const closingBalance0 = await this.accounts[0].getBalance()
  const closingBalance1 = await this.accounts[1].getBalance()

  expect(closingBalance0.sub(startingBalance0))
  .to.equal(ethers.utils.parseEther("9.35"));

  expect(closingBalance1.sub(startingBalance1))
  .to.equal(ethers.utils.parseEther("1.65"));
});


it('vacant, mintAuthorized & burning', async function () {
  // [4] vacant
  expect(await this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.equal(true);

  // [2] mintAuthorized
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[2].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[2].address, tokenId);

  // [4] attempt vacant
  await expect(this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.be.revertedWith('tokenId already minted');

  // [2] burn
  await expect(this.contract.connect(this.accounts[2]).burn(tokenId))
  .to.emit(this.contract, 'Transfer')
  .withArgs(this.accounts[2].address, ethers.constants.AddressZero, tokenId);

  // [4] attempt vacant
  await expect(this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});  


it('vacant, floor', async function () {
  // [4] vacant
  expect(await this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.equal(true);

  // [2] set floor
  await expect(this.contract.connect(this.accounts[2]).setIdFloor(1000))
  .to.emit(this.contract, 'IdFloorSet')
  .withArgs(1000);

  expect(await this.contract.connect(this.accounts[2]).idFloor())
  .to.equal(1000)

  // [4] attempt vacant
  await expect(this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.be.revertedWith('tokenId below floor');
});


it('vacant, revokeId', async function () {
  // [4] vacant
  expect(await this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.equal(true);

  // [2] revokeId
  await expect(this.contract.connect(this.accounts[2]).revokeId(tokenId))
  .to.emit(this.contract, 'IdRevoked')
  .withArgs(tokenId);

  // [4] attempt vacant
  await expect(this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('mintAuthorized, burning', async function () {
  // [4] attempt mintAuthorized
  await expect(this.contract.connect(this.accounts[4]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');

  // [2] attempt mintAuthorized, no tokeURI
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId, ""))
  .to.be.revertedWith('tokenURI cannot be empty');

  // [2] mintAuthorized
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [2] attempt another mintAuthorized, same tokenId 
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId already minted');

  // [2] attempt burn
  await expect(this.contract.connect(this.accounts[2]).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // [4] burn
  await expect(this.contract.connect(this.accounts[4]).burn(tokenId))
  .to.emit(this.contract, 'Transfer')
  .withArgs(this.accounts[4].address, ethers.constants.AddressZero, tokenId);

  // [4] attempt second burn
  await expect(this.contract.connect(this.accounts[4]).burn(tokenId))
  .to.be.revertedWith('ERC721: operator query for nonexistent token');

  // [2] attempt another mintAuthorized for [4]
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('total supply', async function () {
  expect(await this.contract.connect(this.accounts[4]).totalSupply())
  .to.equal(0);

  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [2] mintAuthorized
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId + 1, tokenURI))
  .to.emit(this.contract, 'Transfer')

  expect(await this.contract.connect(this.accounts[4]).totalSupply())
  .to.equal(2);

  // [4] burn
  await expect(this.contract.connect(this.accounts[4]).burn(tokenId))
  .to.emit(this.contract, 'Transfer')

  expect(await this.contract.connect(this.accounts[4]).totalSupply())
  .to.equal(1);

  // [4] burn
  await expect(this.contract.connect(this.accounts[4]).burn(tokenId + 1))
  .to.emit(this.contract, 'Transfer')

  expect(await this.contract.connect(this.accounts[4]).totalSupply())
  .to.equal(0);
});


it('signers, authorised and not', async function () {
  // [0] sign
  const sig0 = await this.accounts[0]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] attempt mintable
  await expect(this.contract.connect(this.accounts[5]).mintable(weiPrice, tokenId, tokenURI, sig0))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [2] sign
  const sig1 = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] mintable
  expect(await this.contract.connect(this.accounts[5]).mintable(weiPrice, tokenId, tokenURI, sig1))
  .to.equal(true);

  // [4] sign
  const sig2 = await this.accounts[4]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] attempt mintable
  await expect(this.contract.connect(this.accounts[5]).mintable(weiPrice, tokenId, tokenURI, sig2))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('signature verification, good and bad inputs', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mintable
  expect(await this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [4] attempt mintable, with incorreet weiPrice
  await expect(this.contract.connect(this.accounts[4]).mintable(ethers.BigNumber.from(weiPrice).add(1), tokenId , tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // [4] attempt mintable, with incorreet tokenId
  await expect(this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId + 1, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // [4] attempt mintable, with incorreet tokenURI
  await expect(this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI + "#", signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('mint, burning', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mintable
  expect(await this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [4] attempt mintable
  await expect(this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId already minted');

  // [5] attempt mint
  await expect(this.contract.connect(this.accounts[5]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId already minted');

  // [5] attempt burn
  await expect(this.contract.connect(this.accounts[5]).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // [4] burn
  await expect(this.contract.connect(this.accounts[4]).burn(tokenId))
  .to.emit(this.contract, 'Transfer')
  .withArgs(this.accounts[4].address, ethers.constants.AddressZero, tokenId);

  // [4] attempt mintable
  await expect(this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');

  // [4] attempt mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('mint, various ETH values', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] attempt mint, insufficient ETH
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: ethers.BigNumber.from(weiPrice).sub(1)}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [4] attempt mint, excessive ETH
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: ethers.BigNumber.from(weiPrice).add(1)}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);
});


it('revokeId an existing Id', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [5] attempt revokeId
  await expect(this.contract.connect(this.accounts[5]).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // [2] attempt revokeId
  await expect(this.contract.connect(this.accounts[2]).revokeId(tokenId))
  .to.be.revertedWith('tokenId already minted');  
});


it('revokeId an non-existant Id', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mintable
  expect(await this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [5] attempt revokeId
  await expect(this.contract.connect(this.accounts[5]).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // [2] revokeId
  await expect(this.contract.connect(this.accounts[2]).revokeId(tokenId))
  .to.emit(this.contract, 'IdRevoked')
  .withArgs(tokenId);

  // [4] attempt mintable
  await expect(this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');  
});


it('setIdFloor', async function () {
  // [5] attempt set floor
  await expect(this.contract.connect(this.accounts[5]).setIdFloor(1000))
  .to.be.revertedWith('unauthorized to set idFloor');

  // [2] set floor
  await expect(this.contract.connect(this.accounts[2]).setIdFloor(1000))
  .to.emit(this.contract, 'IdFloorSet')
  .withArgs(1000);

  // [4] floor
  expect(await this.contract.connect(this.accounts[4]).idFloor())
  .to.equal(1000);

  // [2] attempt set floor, lower
  await expect(this.contract.connect(this.accounts[2]).setIdFloor(999))
  .to.be.revertedWith('must exceed current floor');

  // [2] attempt set floor, identical
  await expect(this.contract.connect(this.accounts[2]).setIdFloor(1000))
  .to.be.revertedWith('must exceed current floor');

  // [2] attempt mintAuthorized
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[2].address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId below floor');

  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] attempt mintable
  await expect(this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId below floor');

  // [4] attempt mint
  await expect(this.contract.connect(this.accounts[4]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId below floor');  
});


it('agent role, revoked', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [2] renounceRole own agent role
  await expect(this.contract.connect(this.accounts[2]).renounceRole(AGENT_ROLE, this.accounts[2].address))
  .to.emit(this.contract, 'RoleRevoked')
  .withArgs(AGENT_ROLE, this.accounts[2].address, this.accounts[2].address);

  // [2] attempt mintAuthorized
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');
  
  // [5] attempt mintable
  await expect(this.contract.connect(this.accounts[4]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [1] grant AGENT_ROLE to [4]
  await expect(this.contract.connect(this.accounts[1]).grantRole(AGENT_ROLE, this.accounts[4].address))
  .to.emit(this.contract, 'RoleGranted')
  .withArgs(AGENT_ROLE, this.accounts[4].address, this.accounts[1].address);

  // [4] mintAuthorized
  await expect(this.contract.connect(this.accounts[4]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);
});


it('agent role, granted', async function () {
  // [4] sign
  const signature = await this.accounts[4]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] attempt mintable
  await expect(this.contract.connect(this.accounts[5]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [5] attempt mint
  await expect(this.contract.connect(this.accounts[5]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('signature invalid or signer unauthorized');  

  // [2] grant AGENT_ROLE to [4]
  await expect(this.contract.connect(this.accounts[1]).grantRole(AGENT_ROLE, this.accounts[4].address))
  .to.emit(this.contract, 'RoleGranted')
  .withArgs(AGENT_ROLE, this.accounts[4].address, this.accounts[1].address);

  // [5] mintable
  expect(await this.contract.connect(this.accounts[5]).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [5] mint
  await expect(this.contract.connect(this.accounts[5]).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[5].address, tokenId);
});


it('tokenURI', async function () {
  // [4] tokenUri
  expect(await this.contract.connect(this.accounts[4]).tokenURI(tokenId))
  .to.equal("");

  // [2] mintAuthorized
  await expect(this.contract.connect(this.accounts[2]).mintAuthorized(this.accounts[4].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [4] tokenUri
  expect(await this.contract.connect(this.accounts[4]).tokenURI(tokenId))
  .to.equal(tokenURI);

  // [4] burn
  await expect(this.contract.connect(this.accounts[4]).burn(tokenId))
  .to.emit(this.contract, 'Transfer')
  .withArgs(this.accounts[4].address, ethers.constants.AddressZero, tokenId);

  // [4] tokenUri
  expect(await this.contract.connect(this.accounts[4]).tokenURI(tokenId))
  .to.equal("");
});
