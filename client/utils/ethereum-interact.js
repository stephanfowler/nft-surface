import { ethers } from "ethers";

const alchemyKey = "https://eth-rinkeby.alchemyapi.io/v2/JZzxLi6MDK2NoxcNmEC7DNDdwICaMxkf";
const contractABI = require("./abi.json");

async function checkChainId(provider, chainIdCheck) {
  const {chainId} = await provider.getNetwork();
  if (chainId === chainIdCheck) {
    return provider;
  } else {
    throw 'Provider chainId does not match catalog chainId';
  }
} 

function getReadableProvider() {
  return window.ethereum ?
    new ethers.providers.Web3Provider(window.ethereum, "any") :
    new ethers.providers.JsonRpcProvider(alchemyKey);
}

async function getReadableContract(contractAddress, chainId) {
  const provider = await checkChainId(getReadableProvider(), chainId);
  return new ethers.Contract(contractAddress, contractABI, provider)
}

async function getWriteableContract(contractAddress, chainId) {
  const provider = await checkChainId(new ethers.providers.Web3Provider(window.ethereum, "any"), chainId);
  return new ethers.Contract(contractAddress, contractABI, provider).connect(provider.getSigner());  
}

export function networkName(chainId) {
  const names = {
    "1":	"Ethereum Mainnet",
    "3":	"Ropsten Test Network",
    "4":	"Rinkeby Test Network",
    "5":	"Goerli Test Network"
  }
  return names[chainId + ""];
}

export const isTransactionMined = async(txHash) => {
  const provider = getReadableProvider();
  const txReceipt = await provider.waitForTransaction(txHash);
  if (txReceipt && txReceipt.blockNumber) {
      return txReceipt;
  }
;}

export const connectWallet = async () => {
  return await getWallet(true);
}

export const getWallet = async (isConnect) => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: isConnect ? 'eth_requestAccounts' : 'eth_accounts' });
      const network = await new ethers.providers.Web3Provider(window.ethereum).getNetwork();
      return {
        address: accounts[0],
        chainId: network.chainId
      };
    } catch (error) {
      return { error: error.message };
    }
  } else {
    return {};
  }
};

export const ownerOf = async (tokenId, contractAddress, chainId) => {
  tokenId = parseInt(tokenId);
  const contract = await getReadableContract(contractAddress, chainId);
  try {
    const owner = await contract.ownerOf(tokenId);
    return owner;
  } catch (error) {
    return;
  }
};

export const claimable = async (art, contractAddress, chainId) => {
  const contract = await getReadableContract(contractAddress, chainId);
  try {
    await contract.claimable(art.weiPrice, art.tokenId, art.tokenURI, art.signature);
    return true;
  } catch (error) {
    return false;
  }
};

export const claim = async (art, contractAddress, chainId) => {
  const contract = await getWriteableContract(contractAddress, chainId);
  try {
    const tx = await contract.claim(art.tokenId, art.tokenURI, art.signature, {value: art.weiPrice});
    return { tx };
  } catch (error) {
    return { error: error.message };
  }
};