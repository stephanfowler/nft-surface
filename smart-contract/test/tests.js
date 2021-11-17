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

let accounts;
let chainId;
let c;
let provider;
let sigDomain
let sigTypes;

let owner;
let admin;
let agent;
let anon1;
let anon2;

beforeEach(async function() {
  /*
  Deploy contract with these accs:
  [0] owner (deployer)
  [1] admin
  [2] agent
  */
 
  accounts = await ethers.getSigners();
  owner = accounts[0];
  admin = accounts[1];
  agent = accounts[2];
  anon1 = accounts[3];
  anon2 = accounts[4];

  ({ chainId } = await ethers.provider.getNetwork());

  const NFTagent = await ethers.getContractFactory('NFTagent');

  c = await NFTagent.deploy(
    "Test",
    "TST",
    admin.address,
    agent.address,
    [owner.address, admin.address],
    [85,15]
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
  const startingBalance4 = await anon2.getBalance();

  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [3] attempt setPrice
  await expect(c.connect(anon1).setPrice(tokenId, salePrice))
  .to.be.revertedWith('caller is not token owner');

  // [3] attempt buy
  await expect(c.connect(anon1).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');

  // [4] setPrice
  await expect(c.connect(anon2).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [4] attempt buy, is already owner
  await expect(c.connect(anon2).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('caller is token owner');

  // [3] attempt buy, insufficient value
  await expect(c.connect(anon1).buy(tokenId, {value: ethers.BigNumber.from(salePrice).sub(1)}))
  .to.be.revertedWith('insufficient ETH sent');

  // [3] price
  expect(await c.connect(anon1).price(tokenId))
  .to.equal(salePrice);  

  const startingBalance3 = await anon1.getBalance();

  // [3] buy
  await expect(c.connect(anon1).buy(tokenId, {value: salePrice}))
  .to.emit(c, 'Bought')
  .withArgs(tokenId, anon1.address);

  const closingBalance3 = await anon1.getBalance()
  const closingBalance4 = await anon2.getBalance();

  // [4] price
  expect(await c.connect(anon2).price(tokenId))
  .to.equal(0);  

  // [4] attempt setPrice
  await expect(c.connect(anon2).setPrice(tokenId, salePrice))
  .to.be.revertedWith('caller is not token owner');

  // [3] ownerOf
  expect(await c.connect(anon1).ownerOf(tokenId))
  .to.equal(anon1.address);

  // [2] attempt buy
  await expect(c.connect(anon2).buy(tokenId, {value: salePrice}))
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
  await expect(c.connect(anon2).setRoyalty(royaltyBasisPoints))
  .to.be.revertedWith('unauthorized to set royalty');

  // [2] attemt setRoyalty, too high
  await expect(c.connect(agent).setRoyalty(10001))
  .to.be.revertedWith('cannot exceed 10000 basis points');

  // [2] setRoyalty
  await expect(c.connect(agent).setRoyalty(royaltyBasisPoints))
  .to.emit(c, 'RoyaltySet')
  .withArgs(royaltyBasisPoints);

  // [2] mintAuthorized for [4]
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [4] setPrice
  await expect(c.connect(anon2).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [3] buy
  await expect(c.connect(anon1).buy(tokenId, {value: salePrice}))
  .to.emit(c, 'Bought')
  .withArgs(tokenId, anon1.address);

  const balance = await provider.getBalance(c.address);
  let ethBalance = ethers.utils.formatEther(balance);
  ethBalance = Math.round(ethBalance * 1e4) / 1e4;

  let expectedRoyalty = ethers.utils.formatEther(salePrice);
  expectedRoyalty = Math.round(expectedRoyalty * 1e6 * royaltyBasisPoints) / (1e10);

  expect(ethBalance)
  .to.equal(expectedRoyalty);
});


it('un-setPrice', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [4] setPrice
  await expect(c.connect(anon2).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [4] setPrice to 0 (remove from sale)
  await expect(c.connect(anon2).setPrice(tokenId, 0))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, 0);

  // [3] attempt buy
  await expect(c.connect(anon1).buy(tokenId, {value: 123456}))
  .to.be.revertedWith('token not for sale');
});


it('setPrice, transfer', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [4] setPrice
  await expect(c.connect(anon2).setPrice(tokenId, salePrice))
  .to.emit(c, 'PriceSet')
  .withArgs(tokenId, salePrice);

  // [1] price
  expect(await c.connect(admin).price(tokenId))
  .to.equal(salePrice);  

  // [4] transferFrom
  await expect(c.connect(anon2).transferFrom(anon2.address, anon1.address, tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anon2.address, anon1.address, tokenId);

  // [1] price
  expect(await c.connect(admin).price(tokenId))
  .to.equal(0);

  // [4] attempt buy
  await expect(c.connect(anon2).buy(tokenId, {value: salePrice}))
  .to.be.revertedWith('token not for sale');
});


it('role assignments', async function () {
  // [0] owner
  expect(await c.connect(anon2).owner())
  .to.equal(owner.address);

  // [4] hasRole [1]
  expect(await c.connect(anon2).hasRole(DEFAULT_ADMIN_ROLE, admin.address))
  .to.equal(true);

  // [4] hasRole [2]
  expect(await c.connect(anon2).hasRole(AGENT_ROLE, agent.address))
  .to.equal(true);
});

it('receiving and withdrawing', async function () {
  const startingBalance0 = await owner.getBalance();
  const startingBalance1 = await admin.getBalance();

  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [3] send 9 ETH
  await expect(anon1.sendTransaction({to: c.address, value: ethers.utils.parseEther("9")}))
  .to.emit(c, 'PaymentReceived')
  .withArgs(anon1.address, ethers.utils.parseEther("9"));

  // totalReceived is now 10 ETH (ie from mint + send)

  // [4] attempt release to [4]
  await expect(c.connect(anon2).release(anon2.address))
  .to.be.revertedWith('PaymentSplitter: account has no shares');

  // [4] release to [0]
  await expect(c.connect(anon2).release(owner.address))
  .to.emit(c, 'PaymentReleased')
  .withArgs(owner.address, ethers.utils.parseEther("8.5")); // 85/100 * 10 ETH

  // [4] attempt repeat release to [0]
  await expect(c.connect(anon2).release(owner.address))
  .to.be.revertedWith('PaymentSplitter: account is not due payment');

  // [3] send 1 ETH more
  await expect(anon1.sendTransaction({to: c.address, value: ethers.utils.parseEther("1.0")}))
  .to.emit(c, 'PaymentReceived')
  .withArgs(anon1.address, ethers.utils.parseEther("1"));

  // [4] release to [0]
  await expect(c.connect(anon2).release(owner.address))
  .to.emit(c, 'PaymentReleased')
  .withArgs(owner.address, ethers.utils.parseEther("0.85")); // 85/100 * 1 ETH

  // [4] release to [1]
  await expect(c.connect(anon2).release(admin.address))
  .to.emit(c, 'PaymentReleased')
  .withArgs(admin.address, ethers.utils.parseEther("1.65")); // 15/100 * 11 ETH

  // [4] attempt repeat release to [1]
  await expect(c.connect(anon2).release(admin.address))
  .to.be.revertedWith('PaymentSplitter: account is not due payment');

  // [4] released to [0]
  expect(await c.connect(anon2).released(owner.address))
  .to.equal(ethers.utils.parseEther("9.35")); // 85/100 * 11 ETH

  // [4] released to [1]
  expect(await c.connect(anon2).released(admin.address))
  .to.equal(ethers.utils.parseEther("1.65"));

  // [4] totalReleased
  expect(await c.connect(anon2).totalReleased())
  .to.equal(ethers.utils.parseEther("11"));

  const closingBalance0 = await owner.getBalance()
  const closingBalance1 = await admin.getBalance()

  expect(closingBalance0.sub(startingBalance0))
  .to.equal(ethers.utils.parseEther("9.35"));

  expect(closingBalance1.sub(startingBalance1))
  .to.equal(ethers.utils.parseEther("1.65"));
});


it('vacant, mintAuthorized & burning', async function () {
  // [4] vacant
  expect(await c.connect(anon2).vacant(tokenId))
  .to.equal(true);

  // [2] mintAuthorized
  await expect(c.connect(agent).mintAuthorized(agent.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, agent.address, tokenId);

  // [4] attempt vacant
  await expect(c.connect(anon2).vacant(tokenId))
  .to.be.revertedWith('tokenId already minted');

  // [2] burn
  await expect(c.connect(agent).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(agent.address, ethers.constants.AddressZero, tokenId);

  // [4] attempt vacant
  await expect(c.connect(anon2).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});  


it('vacant, floor', async function () {
  // [4] vacant
  expect(await c.connect(anon2).vacant(tokenId))
  .to.equal(true);

  // [2] set floor
  await expect(c.connect(agent).setIdFloor(1000))
  .to.emit(c, 'IdFloorSet')
  .withArgs(1000);

  expect(await c.connect(agent).idFloor())
  .to.equal(1000)

  // [4] attempt vacant
  await expect(c.connect(anon2).vacant(tokenId))
  .to.be.revertedWith('tokenId below floor');
});


it('vacant, revokeId', async function () {
  // [4] vacant
  expect(await c.connect(anon2).vacant(tokenId))
  .to.equal(true);

  // [2] revokeId
  await expect(c.connect(agent).revokeId(tokenId))
  .to.emit(c, 'IdRevoked')
  .withArgs(tokenId);

  // [4] attempt vacant
  await expect(c.connect(anon2).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('mintAuthorized, burning', async function () {
  // [4] attempt mintAuthorized
  await expect(c.connect(anon2).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');

  // [2] attempt mintAuthorized, no tokeURI
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId, ""))
  .to.be.revertedWith('tokenURI cannot be empty');

  // [2] mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [2] attempt another mintAuthorized, same tokenId 
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId already minted');

  // [2] attempt burn
  await expect(c.connect(agent).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // [4] burn
  await expect(c.connect(anon2).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anon2.address, ethers.constants.AddressZero, tokenId);

  // [4] attempt second burn
  await expect(c.connect(anon2).burn(tokenId))
  .to.be.revertedWith('ERC721: operator query for nonexistent token');

  // [2] attempt another mintAuthorized for [4]
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('total supply', async function () {
  expect(await c.connect(anon2).totalSupply())
  .to.equal(0);

  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [2] mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId + 1, tokenURI))
  .to.emit(c, 'Transfer')

  expect(await c.connect(anon2).totalSupply())
  .to.equal(2);

  // [4] burn
  await expect(c.connect(anon2).burn(tokenId))
  .to.emit(c, 'Transfer')

  expect(await c.connect(anon2).totalSupply())
  .to.equal(1);

  // [4] burn
  await expect(c.connect(anon2).burn(tokenId + 1))
  .to.emit(c, 'Transfer')

  expect(await c.connect(anon2).totalSupply())
  .to.equal(0);
});


it('signers, authorised and not', async function () {
  // [0] sign
  const sig0 = await owner._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [3] attempt mintable
  await expect(c.connect(anon1).mintable(weiPrice, tokenId, tokenURI, sig0))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [2] sign
  const sig1 = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [3] mintable
  expect(await c.connect(anon1).mintable(weiPrice, tokenId, tokenURI, sig1))
  .to.equal(true);

  // [4] sign
  const sig2 = await anon2._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [3] attempt mintable
  await expect(c.connect(anon1).mintable(weiPrice, tokenId, tokenURI, sig2))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('signature verification, good and bad inputs', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mintable
  expect(await c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [4] attempt mintable, with incorreet weiPrice
  await expect(c.connect(anon2).mintable(ethers.BigNumber.from(weiPrice).add(1), tokenId , tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // [4] attempt mintable, with incorreet tokenId
  await expect(c.connect(anon2).mintable(weiPrice, tokenId + 1, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // [4] attempt mintable, with incorreet tokenURI
  await expect(c.connect(anon2).mintable(weiPrice, tokenId, tokenURI + "#", signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('mint, burning', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mintable
  expect(await c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [4] attempt mintable
  await expect(c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId already minted');

  // [3] attempt mint
  await expect(c.connect(anon1).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId already minted');

  // [3] attempt burn
  await expect(c.connect(anon1).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // [4] burn
  await expect(c.connect(anon2).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anon2.address, ethers.constants.AddressZero, tokenId);

  // [4] attempt mintable
  await expect(c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');

  // [4] attempt mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('mint, various ETH values', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] attempt mint, insufficient ETH
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: ethers.BigNumber.from(weiPrice).sub(1)}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [4] attempt mint, excessive ETH
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: ethers.BigNumber.from(weiPrice).add(1)}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);
});


it('revokeId an existing Id', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [3] attempt revokeId
  await expect(c.connect(anon1).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // [2] attempt revokeId
  await expect(c.connect(agent).revokeId(tokenId))
  .to.be.revertedWith('tokenId already minted');  
});


it('revokeId an non-existant Id', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] mintable
  expect(await c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [3] attempt revokeId
  await expect(c.connect(anon1).revokeId(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // [2] revokeId
  await expect(c.connect(agent).revokeId(tokenId))
  .to.emit(c, 'IdRevoked')
  .withArgs(tokenId);

  // [4] attempt mintable
  await expect(c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');  
});


it('setIdFloor', async function () {
  // [3] attempt set floor
  await expect(c.connect(anon1).setIdFloor(1000))
  .to.be.revertedWith('unauthorized to set idFloor');

  // [2] set floor
  await expect(c.connect(agent).setIdFloor(1000))
  .to.emit(c, 'IdFloorSet')
  .withArgs(1000);

  // [4] floor
  expect(await c.connect(anon2).idFloor())
  .to.equal(1000);

  // [2] attempt set floor, lower
  await expect(c.connect(agent).setIdFloor(999))
  .to.be.revertedWith('must exceed current floor');

  // [2] attempt set floor, identical
  await expect(c.connect(agent).setIdFloor(1000))
  .to.be.revertedWith('must exceed current floor');

  // [2] attempt mintAuthorized
  await expect(c.connect(agent).mintAuthorized(agent.address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId below floor');

  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] attempt mintable
  await expect(c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId below floor');

  // [4] attempt mint
  await expect(c.connect(anon2).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId below floor');  
});


it('agent role, revoked', async function () {
  // [2] sign
  const signature = await agent._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [2] renounceRole own agent role
  await expect(c.connect(agent).renounceRole(AGENT_ROLE, agent.address))
  .to.emit(c, 'RoleRevoked')
  .withArgs(AGENT_ROLE, agent.address, agent.address);

  // [2] attempt mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');
  
  // [3] attempt mintable
  await expect(c.connect(anon2).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [1] grant AGENT_ROLE to [4]
  await expect(c.connect(admin).grantRole(AGENT_ROLE, anon2.address))
  .to.emit(c, 'RoleGranted')
  .withArgs(AGENT_ROLE, anon2.address, admin.address);

  // [4] mintAuthorized
  await expect(c.connect(anon2).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);
});


it('agent role, granted', async function () {
  // [4] sign
  const signature = await anon2._signTypedData(sigDomain, sigTypes, {tokenId, weiPrice, tokenURI});

  // [3] attempt mintable
  await expect(c.connect(anon1).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [3] attempt mint
  await expect(c.connect(anon1).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('signature invalid or signer unauthorized');  

  // [2] grant AGENT_ROLE to [4]
  await expect(c.connect(admin).grantRole(AGENT_ROLE, anon2.address))
  .to.emit(c, 'RoleGranted')
  .withArgs(AGENT_ROLE, anon2.address, admin.address);

  // [3] mintable
  expect(await c.connect(anon1).mintable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [3] mint
  await expect(c.connect(anon1).mint(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon1.address, tokenId);
});


it('tokenURI', async function () {
  // [4] tokenUri
  expect(await c.connect(anon2).tokenURI(tokenId))
  .to.equal("");

  // [2] mintAuthorized
  await expect(c.connect(agent).mintAuthorized(anon2.address, tokenId, tokenURI))
  .to.emit(c, 'Transfer')
  .withArgs(ethers.constants.AddressZero, anon2.address, tokenId);

  // [4] tokenUri
  expect(await c.connect(anon2).tokenURI(tokenId))
  .to.equal(tokenURI);

  // [4] burn
  await expect(c.connect(anon2).burn(tokenId))
  .to.emit(c, 'Transfer')
  .withArgs(anon2.address, ethers.constants.AddressZero, tokenId);

  // [4] tokenUri
  expect(await c.connect(anon2).tokenURI(tokenId))
  .to.equal("");
});
