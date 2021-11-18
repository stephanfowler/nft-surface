import { ethers } from "ethers";

const contractABI = require("./abi.json");

async function getReadableProvider(chainId) {
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum, "any")
  } else if (chainId === 31337) {
    return new ethers.providers.JsonRpcProvider();
  } else {
    return new ethers.providers.JsonRpcProvider(process.env.networkKey);
  }
}

async function getReadableContract(contractAddress, chainId) {
  const provider = await getReadableProvider(chainId);
  return new ethers.Contract(contractAddress, contractABI, provider)
}

async function getWriteableContract(contractAddress, chainId) {
  const provider = await new ethers.providers.Web3Provider(window.ethereum);
  return new ethers.Contract(contractAddress, contractABI, provider).connect(provider.getSigner());  
}

export function networkName(chainId) {
  const names = {
    "1":     "Ethereum Mainnet",
    "3":     "Ropsten Test Network",
    "4":     "Rinkeby Test Network",
    "5":     "Goerli Test Network",
    "1337":  "Localhost 8545",
    "31337": "Localhost 8545"
  }
  return names[chainId + ""];
}

export const isTransactionMined = async(txHash, chainId) => {
  const provider = await getReadableProvider(chainId);
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

export const mintable = async (art, contractAddress, chainId) => {
  const contract = await getReadableContract(contractAddress, chainId);
  try {
    await contract.mintable(art.weiPrice, art.tokenId, art.tokenURI, art.signature);
    return true;
  } catch (error) {
    console.log(error); //
    return false;
  }
};

export const mint = async (art, contractAddress, chainId) => {
  const contract = await getWriteableContract(contractAddress, chainId);
  try {
    const tx = await contract.mint(art.tokenId, art.tokenURI, art.signature, {value: art.weiPrice});
    return { tx };
  } catch (error) {
    return { error: error.message };
  }
};