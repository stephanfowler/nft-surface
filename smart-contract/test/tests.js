const { ethers } = require('hardhat');
const { expect } = require('chai');
const keccak256 = require('keccak256');

const weiPrice = 1000;
const tokenId = 123;
const tokenURI = "ipfs://123456789";

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const AGENT_ROLE         = `0x${keccak256('AGENT_ROLE').toString('hex')}`
const TREASURER_ROLE     = `0x${keccak256('TREASURER_ROLE').toString('hex')}`

beforeEach(async function() {
  /*
  Deploy contract:
  [0] owner (deployer)
  [1] admin
  [2] agent
  [3] treasurer
  */
 
  this.accounts = await ethers.getSigners();
  ({ chainId: this.chainId } = await ethers.provider.getNetwork());

  const NFTagent = await ethers.getContractFactory('NFTagent');
  this.contract = await NFTagent.deploy(this.accounts[1].address, this.accounts[2].address, this.accounts[3].address);
  await this.contract.deployed();

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

it('Vacancy, minting & burning', async function () {
  // [4] vacant
  expect(await this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.equal(true);

  // [2] mint
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[2].address, tokenId, tokenURI))
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


it('Vacancy, revoking', async function () {
  // [4] vacant
  expect(await this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.equal(true);

  // [2] revoke
  await expect(this.contract.connect(this.accounts[2]).revoke(tokenId))
  .to.be.empty;

  // [4] attempt vacant
  await expect(this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.be.revertedWith('tokenId revoked or burnt');
});  


it('Vacancy, floor', async function () {
  // [4] vacant
  expect(await this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.equal(true);

  // [2] set floor
  await expect(this.contract.connect(this.accounts[2]).setFloor(1000))
  .to.be.empty;

  // [4] attempt vacant
  await expect(this.contract.connect(this.accounts[4]).vacant(tokenId))
  .to.be.revertedWith('tokenId below floor');
});  


it('Role assignments', async function () {
  // [0] owner
  expect(await this.contract.connect(this.accounts[4]).owner())
  .to.equal(this.accounts[0].address);

  // [4] hasRole [1]
  expect(await this.contract.connect(this.accounts[4]).hasRole(DEFAULT_ADMIN_ROLE, this.accounts[1].address))
  .to.equal(true);

  // [4] hasRole [2]
  expect(await this.contract.connect(this.accounts[4]).hasRole(AGENT_ROLE, this.accounts[2].address))
  .to.equal(true);

  // [4] hasRole [3]
  expect(await this.contract.connect(this.accounts[4]).hasRole(TREASURER_ROLE, this.accounts[3].address))
  .to.equal(true);
});

it('Receiving and withdrawing', async function () {
  // [5] send ETH
  await expect(this.accounts[5].sendTransaction({to: this.contract.address, value: 100}))
  .to.emit(this.contract, 'Receipt')
  .withArgs(this.accounts[5].address, 100);

  // [4] attempt withdraw
  await expect(this.contract.connect(this.accounts[4]).withdraw(this.accounts[4].address, 100))
  .to.be.revertedWith('unauthorized to withdraw');

  // [3] attempt withdraw, excessive amount
  await expect(this.contract.connect(this.accounts[3]).withdraw(this.accounts[3].address, 101))
  .to.be.revertedWith('amount exceeds balance');

  // [3] withdraw
  await expect(this.contract.connect(this.accounts[3]).withdraw(this.accounts[3].address, 50))
  .to.emit(this.contract, 'Withdrawal')
  .withArgs(this.accounts[3].address, 50);

  // [3] withdraw for [0]
  await expect(this.contract.connect(this.accounts[3]).withdraw(this.accounts[0].address, 50))
  .to.emit(this.contract, 'Withdrawal')
  .withArgs(this.accounts[0].address, 50);
});


it('Minting, burning', async function () {
  // [4] attempt mint
  await expect(this.contract.connect(this.accounts[4]).mint(this.accounts[4].address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');

  // [2] attempt mint, no tokeURI
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[4].address, tokenId, ""))
  .to.be.revertedWith('tokenURI cannot be empty');

  // [2] mint
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[4].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [2] attempt another mint, same tokenId 
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[4].address, tokenId, tokenURI))
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

  // [2] attempt another mint for [4]
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[4].address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('Total supply', async function () {
  expect(await this.contract.connect(this.accounts[4]).totalSupply())
  .to.equal(0);

  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] claim
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [2] mint
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[4].address, tokenId + 1, tokenURI))
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


it('TokenId floor', async function () {
  // [5] attempt set floor
  await expect(this.contract.connect(this.accounts[5]).setFloor(1000))
  .to.be.revertedWith('unauthorized to set floor');

  // [2] set floor
  await expect(this.contract.connect(this.accounts[2]).setFloor(1000))
  .to.be.empty;

  // [2] attempt set floor, lower
  await expect(this.contract.connect(this.accounts[2]).setFloor(999))
  .to.be.revertedWith('must exceed current floor');

  // [2] attempt set floor, identical
  await expect(this.contract.connect(this.accounts[2]).setFloor(1000))
  .to.be.revertedWith('must exceed current floor');

  // [4] floor
  expect(await this.contract.connect(this.accounts[4]).idFloor())
  .to.equal(1000);

  // [2] attempt mint
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[2].address, tokenId, tokenURI))
  .to.be.revertedWith('tokenId below floor');

  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] attempt claimable
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId below floor');

  // [4] attempt claim
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId below floor');  
});


it('Signers, authorised and not', async function () {
  // [0] sign
  const sig0 = await this.accounts[0]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] attempt claimable
  await expect(this.contract.connect(this.accounts[5]).claimable(weiPrice, tokenId, tokenURI, sig0))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [2] sign
  const sig1 = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] claimable
  expect(await this.contract.connect(this.accounts[5]).claimable(weiPrice, tokenId, tokenURI, sig1))
  .to.equal(true);

  // [4] sign
  const sig2 = await this.accounts[4]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] attempt claimable
  await expect(this.contract.connect(this.accounts[5]).claimable(weiPrice, tokenId, tokenURI, sig2))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('Signature verification, good and bad inputs', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] claimable
  expect(await this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [4] attempt claimable, with incorreet weiPrice
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice + 1, tokenId , tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // [4] attempt claimable, with incorreet tokenId
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId + 1, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
  
  // [4] attempt claimable, with incorreet tokenURI
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI + "#", signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');
});  


it('Claiming, burning', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] claimable
  expect(await this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [4] claim
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [4] attempt claimable
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId already minted');

  // [5] attempt claim
  await expect(this.contract.connect(this.accounts[5]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId already minted');

  // [5] attempt burn
  await expect(this.contract.connect(this.accounts[5]).burn(tokenId))
  .to.be.revertedWith('caller is not owner nor approved');

  // [4] burn
  await expect(this.contract.connect(this.accounts[4]).burn(tokenId))
  .to.emit(this.contract, 'Transfer')
  .withArgs(this.accounts[4].address, ethers.constants.AddressZero, tokenId);

  // [4] attempt claimable
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');

  // [4] attempt claim
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('tokenId revoked or burnt');
});


it('Claiming, various ETH values', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] attempt claim, insufficient ETH
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice - 1}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [4] attempt claim, excessive ETH
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice + 1}))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [4] claim
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);
});


it('Revoking an existing Id', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] claim
  await expect(this.contract.connect(this.accounts[4]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [5] attempt revoke
  await expect(this.contract.connect(this.accounts[5]).revoke(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // [2] attempt revoke
  await expect(this.contract.connect(this.accounts[2]).revoke(tokenId))
  .to.be.revertedWith('tokenId already minted');  
});


it('Revoking an non-existant Id', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [4] claimable
  expect(await this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [5] attempt revoke
  await expect(this.contract.connect(this.accounts[5]).revoke(tokenId))
  .to.be.revertedWith('unauthorized to revoke id');  

  // [2] revoke
  await expect(this.contract.connect(this.accounts[2]).revoke(tokenId))
  .to.be.empty;

  // [4] attempt claimable
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('tokenId revoked or burnt');  
});


it('Agent role, revoked', async function () {
  // [2] sign
  const signature = await this.accounts[2]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [2] renounceRole own agent role
  await expect(this.contract.connect(this.accounts[2]).renounceRole(AGENT_ROLE, this.accounts[2].address))
  .to.emit(this.contract, 'RoleRevoked')
  .withArgs(AGENT_ROLE, this.accounts[2].address, this.accounts[2].address);

  // [2] attempt mint
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[4].address, tokenId, tokenURI))
  .to.be.revertedWith('unauthorized to mint');
  
  // [5] attempt claimable
  await expect(this.contract.connect(this.accounts[4]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [1] grant AGENT_ROLE to [4]
  await expect(this.contract.connect(this.accounts[1]).grantRole(AGENT_ROLE, this.accounts[4].address))
  .to.emit(this.contract, 'RoleGranted')
  .withArgs(AGENT_ROLE, this.accounts[4].address, this.accounts[1].address);

  // [4] mint
  await expect(this.contract.connect(this.accounts[4]).mint(this.accounts[4].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);
});


it('Agent role, granted', async function () {
  // [4] sign
  const signature = await this.accounts[4]._signTypedData(this.sigDomain, this.sigTypes, {tokenId, weiPrice, tokenURI});

  // [5] attempt claimable
  await expect(this.contract.connect(this.accounts[5]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.be.revertedWith('signature invalid or signer unauthorized');

  // [5] attempt claim
  await expect(this.contract.connect(this.accounts[5]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.be.revertedWith('signature invalid or signer unauthorized');  

  // [2] grant AGENT_ROLE to [4]
  await expect(this.contract.connect(this.accounts[1]).grantRole(AGENT_ROLE, this.accounts[4].address))
  .to.emit(this.contract, 'RoleGranted')
  .withArgs(AGENT_ROLE, this.accounts[4].address, this.accounts[1].address);

  // [5] claimable
  expect(await this.contract.connect(this.accounts[5]).claimable(weiPrice, tokenId, tokenURI, signature))
  .to.equal(true);

  // [5] claim
  await expect(this.contract.connect(this.accounts[5]).claim(tokenId, tokenURI, signature, {value: weiPrice}))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[5].address, tokenId);
});


it('TokenURI', async function () {
  // [4] tokenUri
  expect(await this.contract.connect(this.accounts[4]).tokenURI(tokenId))
  .to.equal("");

  // [2] mint
  await expect(this.contract.connect(this.accounts[2]).mint(this.accounts[4].address, tokenId, tokenURI))
  .to.emit(this.contract, 'Transfer')
  .withArgs(ethers.constants.AddressZero, this.accounts[4].address, tokenId);

  // [4] tokenUri
  expect(await this.contract.connect(this.accounts[4]).tokenURI(tokenId))
  .to.equal(tokenURI);
});
