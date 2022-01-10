const { ethers } = require('hardhat');
const { expect } = require('chai')

const weiPrice = ethers.utils.parseEther("1");
const tokenId = 12345;
const tokenURI = "ipfs://123456789";
const salePrice = ethers.utils.parseEther("2");
const royaltyBasisPoints = 495; // = 4.95%

let c; // the contract, for brevity
let chainId;
let provider;
let sigDomain
let sigTypes;

// accounts
let owner;
let anonA;
let anonB;
let zero = ethers.constants.AddressZero;

beforeEach(async function() {
  const accounts = await ethers.getSigners();
  owner = accounts[0];
  anonA = accounts[1];
  anonB = accounts[2];

  ({ chainId } = await ethers.provider.getNetwork());

  const NFTsurface = await ethers.getContractFactory('NFTsurface');

  c = await NFTsurface.deploy( // c is the contract
    "Testy McTestface",
    "TEST",
    royaltyBasisPoints
  );

  await c.deployed();

  provider = ethers.provider;

  sigDomain = {
    name: 'NFTsurface',
    version: '1.0.0',
    chainId: chainId,
    verifyingContract: c.address,
  };

  sigTypes = {
    mint: [
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
  const startingBalance4 = await anonB.getBalance();

  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonA attempt setPrice
  await expect(c.connect(anonA).setPrice(tokenId, salePrice))
  .to.be.revertedWith('caller is not token owner');

  // anonA attempt buy
  await expect(c.connect(anonA).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');

  // anonB setPrice
  await expect(c.connect(anonB).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // anonB attempt buy, is already owner
  await expect(c.connect(anonB).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('caller is token owner');

  // anonA attempt buy, insufficient value
  await expect(c.connect(anonA).buy(tokenId, {value: ethers.BigNumber.from(salePrice).sub(1)}))
  .to.be.revertedWith('insufficient ETH sent');

  // anonA price
  expect(await c.connect(anonA).price(tokenId))
  .to.equal(salePrice);  

  const startingBalance3 = await anonA.getBalance();

  // anonA buy
  await expect(c.connect(anonA).buy(tokenId, {value: salePrice}))
  .to.emit(c, 'Bought')
  .withArgs(tokenId, anonA.address);

  const closingBalance3 = await anonA.getBalance()
  const closingBalance4 = await anonB.getBalance();

  // anonB price
  expect(await c.connect(anonB).price(tokenId))
  .to.equal(0);  

  // anonB attempt setPrice
  await expect(c.connect(anonB).setPrice(tokenId, salePrice))
  .to.be.revertedWith('caller is not token owner');

  // anonB ownerOf
  expect(await c.connect(anonB).ownerOf(tokenId))
  .to.equal(anonA.address);

  // owner attempt buy
  await expect(c.connect(anonB).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');

  // gas fee makes the closing balances inexact, so need to rely on gt/lt
  expect(closingBalance3.lt(startingBalance3.sub(salePrice)))
  .to.equal(true);

  expect(closingBalance4.gt(startingBalance4)
      && closingBalance4.lt(startingBalance4.add(salePrice)))
  .to.equal(true);
});


it('royalty', async function () {
  // anonB royalty
  expect(await c.connect(anonB).royaltyBasisPoints())
  .to.equal(royaltyBasisPoints);

  // owner mintAuthorized for anonB
  await expect(c.connect(owner).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonB setPrice
  await expect(c.connect(anonB).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // anonA buy
  await expect(c.connect(anonA).buy(tokenId, {value: salePrice}))
  .to.emit(c, 'Bought')
  .withArgs(tokenId, anonA.address);

  const contractBalance = await provider.getBalance(c.address);
  let contractEthBalance = ethers.utils.formatEther(contractBalance);
  contractEthBalance = Math.round(contractEthBalance * 1e4) / 1e4;

  let expectedEthRoyalty = ethers.utils.formatEther(salePrice);
  expectedEthRoyalty = Math.round(expectedEthRoyalty * 1e6 * royaltyBasisPoints) / (1e10);

  expect(contractEthBalance).to.equal(expectedEthRoyalty);
});


it('un-setPrice', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonB setPrice
  await expect(c.connect(anonB).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // anonB setPrice to 0 (remove from sale)
  await expect(c.connect(anonB).setPrice(tokenId, 0))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, 0);

  // anonA attempt buy
  await expect(c.connect(anonA).buy(tokenId, {value: 123456}))
  .to.be.revertedWith('token not for sale');
});


it('setPrice, transfer', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonB setPrice
  await expect(c.connect(anonB).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // owner price
  expect(await c.connect(owner).price(tokenId))
  .to.equal(salePrice);  

  // anonB transferFrom to anonA
  await expect(c.connect(anonB).transferFrom(anonB.address, anonA.address, tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anonB.address, anonA.address, tokenId);

  // owner price
  expect(await c.connect(owner).price(tokenId))
  .to.equal(0);

  // anonB attempt buy
  await expect(c.connect(anonB).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');
});


it('role assignments', async function () {
  // anonB owner
  expect(await c.connect(anonB).owner())
  .to.equal(owner.address);
});


it('receiving and withdrawing', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonA send 9 ETH
  await expect(anonA.sendTransaction({to: c.address, value: ethers.utils.parseEther("9")}))
  .to.emit(c, 'Receipt')
  .withArgs(ethers.utils.parseEther("9"));

  // totalReceived is now 10 ETH (ie from mint + send)

  // owner withdraws
  await expect(c.connect(owner).withdraw())
  .to.emit(c, 'Withdrawal')
  .withArgs(ethers.utils.parseEther("10"));
});


it('vacant, mintAuthorized & burning', async function () {
  // anonB vacant
  expect(await c.connect(anonB).vacant(tokenId))
  .to.equal(true);

  // owner mintAuthorized
  await expect(c.connect(owner).mintAuthorized(owner.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(zero, owner.address, tokenId);

  // anonB attempt vacant
  await expect(c.connect(anonB).vacant(tokenId))
  .to.be.revertedWith('tokenId already minted');

  // owner burn
  await expect(c.connect(owner).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(owner.address, zero, tokenId);

  // anonB attempt vacant
  await expect(c.connect(anonB).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});  


it('vacant, floor', async function () {
  // anonB vacant
  expect(await c.connect(anonB).vacant(tokenId))
  .to.equal(true);

  // owner set floor
  await expect(c.connect(owner).setIdFloor(tokenId + 1))
  .to.emit(c, 'IdFloorSet')
  .withArgs(tokenId + 1);

  expect(await c.connect(owner).idFloor())
  .to.equal(tokenId + 1)

  // anonB attempt vacant
  await expect(c.connect(anonB).vacant(tokenId))
  .to.be.revertedWith('tokenId below floor');
});


it('vacant, revokeId', async function () {
  // anonB vacant
  expect(await c.connect(anonB).vacant(tokenId))
  .to.equal(true);

  // owner revokeId
  await expect(c.connect(owner).revokeId(tokenId))
  .to.emit(c, 'IdRevoked')
  .withArgs(tokenId);

  // anonB attempt vacant
  await expect(c.connect(anonB).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('mintAuthorized, burning', async function () {
  // anonB attempt mintAuthorized
  await expect(c.connect(anonB).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');

  // owner attempt mintAuthorized, no tokeURI
  await expect(c.connect(owner).mintAuthorized(anonB.address, tokenId, ""))
  .to.be.revertedWith('tokenURI cannot be empty');

  // owner mintAuthorized
  await expect(c.connect(owner).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // owner attempt another mintAuthorized, same tokenId 
  await expect(c.connect(owner).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId already minted');

  // owner attempt burn
  await expect(c.connect(owner).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // anonB burn
  await expect(c.connect(anonB).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anonB.address, zero, tokenId);

  // anonB attempt second burn
  await expect(c.connect(anonB).burn(tokenId))
  .to.be.revertedWith('ERC721: operator query for nonexistent token');

  // owner attempt another mintAuthorized for anonB
  await expect(c.connect(owner).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('total supply', async function () {
  expect(await c.connect(anonB).totalSupply())
  .to.equal(0);

  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // owner mintAuthorized
  await expect(c.connect(owner).mintAuthorized(anonB.address, tokenId + 1, tokenURI))
  .to.emit(c, 'Transfer')

  expect(await c.connect(anonB).totalSupply())
  .to.equal(2);

  // anonB burn
  await expect(c.connect(anonB).burn(tokenId))
  .to.emit(c, 'Transfer')

  expect(await c.connect(anonB).totalSupply())
  .to.equal(1);

  // anonB burn
  await expect(c.connect(anonB).burn(tokenId + 1))
  .to.emit(c, 'Transfer')

  expect(await c.connect(anonB).totalSupply())
  .to.equal(0);
});


it('signers, authorised and not', async function () {
  // owner sign (signature will be invalid)
  const sig0 = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonA attempt mintable
  expect(await c.connect(anonA).mintable(weiPrice, tokenId, tokenURI, sig0))
  .to.equal(true);

  // anonB sign (signature will be invalid)
  const sig2 = await anonB._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonA attempt mintable
  await expect(c.connect(anonA).mintable(weiPrice, tokenId, tokenURI, sig2))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('signature verification, good and bad inputs', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mintable
  expect(await c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // anonB attempt mintable, with incorreet weiPrice
  await expect(c.connect(anonB).mintable(ethers.BigNumber.from(weiPrice).add(1), tokenId , tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // anonB attempt mintable, with incorreet tokenId
  await expect(c.connect(anonB).mintable(weiPrice, tokenId + 1, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // anonB attempt mintable, with incorreet tokenURI
  await expect(c.connect(anonB).mintable(weiPrice, tokenId, tokenURI + "#", signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('mint, burning', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mintable
  expect(await c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonB attempt mintable
  await expect(c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId already minted');

  // anonA attempt mint
  await expect(c.connect(anonA).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId already minted');

  // anonA attempt burn
  await expect(c.connect(anonA).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // anonB burn
  await expect(c.connect(anonB).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anonB.address, zero, tokenId);

  // anonB attempt mintable
  await expect(c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');

  // anonB attempt mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('mint, various ETH values', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB attempt mint, insufficient ETH
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: ethers.BigNumber.from(weiPrice).sub(1)}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // anonB attempt mint, excessive ETH
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: ethers.BigNumber.from(weiPrice).add(1)}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);
});


it('revokeId an existing Id', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonA attempt revokeId
  await expect(c.connect(anonA).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // owner attempt revokeId
  await expect(c.connect(owner).revokeId(tokenId))
  .to.be.revertedWith('tokenId already minted');  
});


it('revokeId an non-existant Id', async function () {
  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mintable
  expect(await c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // anonA attempt revokeId
  await expect(c.connect(anonA).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // owner revokeId
  await expect(c.connect(owner).revokeId(tokenId))
  .to.emit(c, 'IdRevoked')
  .withArgs(tokenId);

  // anonB attempt mintable
  await expect(c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');  
});


it('setIdFloor', async function () {
  // anonA attempt set floor
  await expect(c.connect(anonA).setIdFloor(tokenId + 1))
  .to.be.revertedWith('unauthorized to set idFloor');

  // owner set floor
  await expect(c.connect(owner).setIdFloor(tokenId + 1))
  .to.emit(c, 'IdFloorSet')
  .withArgs(tokenId + 1);

  // anonB floor
  expect(await c.connect(anonB).idFloor())
  .to.equal(tokenId + 1);

  // owner attempt set floor, lower
  await expect(c.connect(owner).setIdFloor(tokenId))
  .to.be.revertedWith('must exceed current floor');

  // owner attempt set floor, identical
  await expect(c.connect(owner).setIdFloor(tokenId + 1))
  .to.be.revertedWith('must exceed current floor');

  // owner attempt mintAuthorized
  await expect(c.connect(owner).mintAuthorized(owner.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId below floor');

  // owner sign
  const signature = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB attempt mintable
  await expect(c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId below floor');

  // anonB attempt mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId below floor');  
});


it('tokenURI', async function () {
  // anonB tokenUri
  expect(await c.connect(anonB).tokenURI(tokenId))
  .to.equal("");

  // owner mintAuthorized
  await expect(c.connect(owner).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonB tokenUri
  expect(await c.connect(anonB).tokenURI(tokenId))
  .to.equal(tokenURI);

  // anonB burn
  await expect(c.connect(anonB).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anonB.address, zero, tokenId);

  // anonB tokenUri
  expect(await c.connect(anonB).tokenURI(tokenId))
  .to.equal("");
});
