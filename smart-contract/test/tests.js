const { ethers } = require('hardhat');
const { expect } = require('chai')
const keccak256 = require('keccak256');

const weiPrice = ethers.utils.parseEther("1");
const tokenId = 12345;
const tokenURI = "ipfs://123456789";
const salePrice = ethers.utils.parseEther("2");
const royaltyBasisPoints = 1499; // = 14.99%

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const AGENT_ROLE         = `0x${keccak256('AGENT_ROLE').toString('hex')}`

let c; // the contract, for brevity
let chainId;
let provider;
let sigDomain
let sigTypes;

// accounts
let owner;
let admin;
let agent;
let anonA;
let anonB;
let zero = ethers.constants.AddressZero;

beforeEach(async function() {
  const accounts = await ethers.getSigners();
  owner = accounts[0];
  admin = accounts[1];
  agent = accounts[2];
  anonA = accounts[3];
  anonB = accounts[4];

  ({ chainId } = await ethers.provider.getNetwork());

  const NFTagent = await ethers.getContractFactory('NFTagent');

  c = await NFTagent.deploy( // c is the contract
    "Testy McTestface",
    "TEST",
    admin.address,
    agent.address,
    [owner.address, admin.address],
    [85,15],
    royaltyBasisPoints
  );

  await c.deployed();

  provider = ethers.provider;

  sigDomain = {
    name: 'NFTagent',
    version: '1.0.0',
    chainId: chainId,
    verifyingContract: c.address,
  };

  sigTypes = {
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
  const startingBalance4 = await anonB.getBalance();

  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

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

  // agent attempt buy
  await expect(c.connect(anonB).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');

  // gas fee make the closing balances inexact, so need to rely on gt/lt
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

  // agent mintAuthorized for anonB
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId, tokenURI))
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
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

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
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonB setPrice
  await expect(c.connect(anonB).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // admin price
  expect(await c.connect(admin).price(tokenId))
  .to.equal(salePrice);  

  // anonB transferFrom to anonA
  await expect(c.connect(anonB).transferFrom(anonB.address, anonA.address, tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anonB.address, anonA.address, tokenId);

  // admin price
  expect(await c.connect(admin).price(tokenId))
  .to.equal(0);

  // anonB attempt buy
  await expect(c.connect(anonB).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');
});


it('role assignments', async function () {
  // anonB owner
  expect(await c.connect(anonB).owner())
  .to.equal(owner.address);

  // anonB hasRole admin
  expect(await c.connect(anonB).hasRole(DEFAULT_ADMIN_ROLE, admin.address))
  .to.equal(true);

  // anonB hasRole agent
  expect(await c.connect(anonB).hasRole(AGENT_ROLE, agent.address))
  .to.equal(true);
});


it('receiving and withdrawing', async function () {
  const startingBalance0 = await owner.getBalance();
  const startingBalance1 = await admin.getBalance();

  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonA send 9 ETH
  await expect(anonA.sendTransaction({to: c.address, value: ethers.utils.parseEther("9")}))
  .to.emit(c, 'PaymentReceived')
  .withArgs(anonA.address, ethers.utils.parseEther("9"));

  // totalReceived is now 10 ETH (ie from mint + send)

  // anonB attempt release to anonB
  await expect(c.connect(anonB).release(anonB.address))
  .to.be.revertedWith('PaymentSplitter: account has no shares');

  // anonB release to owner
  await expect(c.connect(anonB).release(owner.address))
  .to.emit(c, 'PaymentReleased')
  .withArgs(owner.address, ethers.utils.parseEther("8.5")); // 85/100 * 10 ETH

  // anonB attempt repeat release to owner
  await expect(c.connect(anonB).release(owner.address))
  .to.be.revertedWith('PaymentSplitter: account is not due payment');

  // anonA send 1 ETH more
  await expect(anonA.sendTransaction({to: c.address, value: ethers.utils.parseEther("1.0")}))
  .to.emit(c, 'PaymentReceived')
  .withArgs(anonA.address, ethers.utils.parseEther("1"));

  // anonB release to owner
  await expect(c.connect(anonB).release(owner.address))
  .to.emit(c, 'PaymentReleased')
  .withArgs(owner.address, ethers.utils.parseEther("0.85")); // 85/100 * 1 ETH

  // anonB release to admin
  await expect(c.connect(anonB).release(admin.address))
  .to.emit(c, 'PaymentReleased')
  .withArgs(admin.address, ethers.utils.parseEther("1.65")); // 15/100 * 11 ETH

  // anonB attempt repeat release to admin
  await expect(c.connect(anonB).release(admin.address))
  .to.be.revertedWith('PaymentSplitter: account is not due payment');

  // anonB released to owner
  expect(await c.connect(anonB).released(owner.address))
  .to.equal(ethers.utils.parseEther("9.35")); // 85/100 * 11 ETH

  // anonB released to admin
  expect(await c.connect(anonB).released(admin.address))
  .to.equal(ethers.utils.parseEther("1.65"));

  // anonB totalReleased
  expect(await c.connect(anonB).totalReleased())
  .to.equal(ethers.utils.parseEther("11"));

  const closingBalance0 = await owner.getBalance()
  const closingBalance1 = await admin.getBalance()

  expect(closingBalance0.sub(startingBalance0))
  .to.equal(ethers.utils.parseEther("9.35"));

  expect(closingBalance1.sub(startingBalance1))
  .to.equal(ethers.utils.parseEther("1.65"));
});


it('vacant, mintAuthorized & burning', async function () {
  // anonB vacant
  expect(await c.connect(anonB).vacant(tokenId))
  .to.equal(true);

  // agent mintAuthorized
  await expect(c.connect(agent).mintAuthorized(agent.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(zero, agent.address, tokenId);

  // anonB attempt vacant
  await expect(c.connect(anonB).vacant(tokenId))
  .to.be.revertedWith('tokenId already minted');

  // agent burn
  await expect(c.connect(agent).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(agent.address, zero, tokenId);

  // anonB attempt vacant
  await expect(c.connect(anonB).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});  


it('vacant, floor', async function () {
  // anonB vacant
  expect(await c.connect(anonB).vacant(tokenId))
  .to.equal(true);

  // agent set floor
  await expect(c.connect(agent).setIdFloor(tokenId + 1))
  .to.emit(c, 'IdFloorSet')
  .withArgs(tokenId + 1);

  expect(await c.connect(agent).idFloor())
  .to.equal(tokenId + 1)

  // anonB attempt vacant
  await expect(c.connect(anonB).vacant(tokenId))
  .to.be.revertedWith('tokenId below floor');
});


it('vacant, revokeId', async function () {
  // anonB vacant
  expect(await c.connect(anonB).vacant(tokenId))
  .to.equal(true);

  // agent revokeId
  await expect(c.connect(agent).revokeId(tokenId))
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

  // agent attempt mintAuthorized, no tokeURI
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId, ""))
  .to.be.revertedWith('tokenURI cannot be empty');

  // agent mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // agent attempt another mintAuthorized, same tokenId 
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId already minted');

  // agent attempt burn
  await expect(c.connect(agent).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // anonB burn
  await expect(c.connect(anonB).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anonB.address, zero, tokenId);

  // anonB attempt second burn
  await expect(c.connect(anonB).burn(tokenId))
  .to.be.revertedWith('ERC721: operator query for nonexistent token');

  // agent attempt another mintAuthorized for anonB
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('total supply', async function () {
  expect(await c.connect(anonB).totalSupply())
  .to.equal(0);

  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // agent mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId + 1, tokenURI))
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
  await expect(c.connect(anonA).mintable(weiPrice, tokenId, tokenURI, sig0))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // agent sign
  const sig1 = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonA mintable
  expect(await c.connect(anonA).mintable(weiPrice, tokenId, tokenURI, sig1))
  .to.equal(true);

  // anonB sign (signature will be invalid)
  const sig2 = await anonB._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonA attempt mintable
  await expect(c.connect(anonA).mintable(weiPrice, tokenId, tokenURI, sig2))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('signature verification, good and bad inputs', async function () {
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

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
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

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
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

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
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);

  // anonA attempt revokeId
  await expect(c.connect(anonA).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // agent attempt revokeId
  await expect(c.connect(agent).revokeId(tokenId))
  .to.be.revertedWith('tokenId already minted');  
});


it('revokeId an non-existant Id', async function () {
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB mintable
  expect(await c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // anonA attempt revokeId
  await expect(c.connect(anonA).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // agent revokeId
  await expect(c.connect(agent).revokeId(tokenId))
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

  // agent set floor
  await expect(c.connect(agent).setIdFloor(tokenId + 1))
  .to.emit(c, 'IdFloorSet')
  .withArgs(tokenId + 1);

  // anonB floor
  expect(await c.connect(anonB).idFloor())
  .to.equal(tokenId + 1);

  // agent attempt set floor, lower
  await expect(c.connect(agent).setIdFloor(tokenId))
  .to.be.revertedWith('must exceed current floor');

  // agent attempt set floor, identical
  await expect(c.connect(agent).setIdFloor(tokenId + 1))
  .to.be.revertedWith('must exceed current floor');

  // agent attempt mintAuthorized
  await expect(c.connect(agent).mintAuthorized(agent.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId below floor');

  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonB attempt mintable
  await expect(c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId below floor');

  // anonB attempt mint
  await expect(c.connect(anonB).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId below floor');  
});


it('agent role, revoked', async function () {
  // agent sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // agent renounceRole own agent role
  await expect(c.connect(agent).renounceRole(AGENT_ROLE, agent.address))
  .to.emit(c, 'RoleRevoked')
  .withArgs(AGENT_ROLE, agent.address, agent.address);

  // agent attempt mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');
  
  // anonA attempt mintable
  await expect(c.connect(anonB).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // admin grant AGENT_ROLE to anonB
  await expect(c.connect(admin).grantRole(AGENT_ROLE, anonB.address))
  .to.emit(c, 'RoleGranted')
  .withArgs(AGENT_ROLE, anonB.address, admin.address);

  // anonB mintAuthorized
  await expect(c.connect(anonB).mintAuthorized(anonB.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonB.address, tokenId);
});


it('agent role, granted', async function () {
  // anonB sign
  const signature = await anonB._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // anonA attempt mintable
  await expect(c.connect(anonA).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // anonA attempt mint
  await expect(c.connect(anonA).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('signature invalid or signer unauthorized');  

  // agent grant AGENT_ROLE to anonB
  await expect(c.connect(admin).grantRole(AGENT_ROLE, anonB.address))
  .to.emit(c, 'RoleGranted')
  .withArgs(AGENT_ROLE, anonB.address, admin.address);

  // anonA mintable
  expect(await c.connect(anonA).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // anonA mint
  await expect(c.connect(anonA).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(zero, anonA.address, tokenId);
});


it('tokenURI', async function () {
  // anonB tokenUri
  expect(await c.connect(anonB).tokenURI(tokenId))
  .to.equal("");

  // agent mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anonB.address, tokenId, tokenURI))
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
