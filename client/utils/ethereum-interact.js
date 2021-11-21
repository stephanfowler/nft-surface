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

export const contractCall_ownerOf = async (nft, contractAddress, chainId) => {
  const contract = await getReadableContract(contractAddress, chainId);
  try {
    const owner = await contract.ownerOf(nft.tokenId);
    return owner;
  } catch (error) {}
};

export const contractCall_mintable = async (nft, contractAddress, chainId) => {
  const contract = await getReadableContract(contractAddress, chainId);
  try {
    await contract.mintable(nft.weiPrice, nft.tokenId, nft.tokenURI, nft.signature);
    return true;
  } catch (error) {
    console.log(error); //
    return false;
  }
};

export const contractCall_mint = async (nft, contractAddress, chainId) => {
  const contract = await getWriteableContract(contractAddress, chainId);
  try {
    const tx = await contract.mint(nft.tokenId, nft.tokenURI, nft.signature, {value: nft.weiPrice});
    return { tx };
  } catch (error) {
    return { error: error.message };
  }
};

export const contractCall_price = async (nft, contractAddress, chainId) => {
  const contract = await getReadableContract(contractAddress, chainId);
  return await contract.price(nft.tokenId);
};

export const contractCall_setPrice = async (nft, salePrice, contractAddress, chainId) => {
  const contract = await getWriteableContract(contractAddress, chainId);
  return await contract.setPrice(nft.tokenId, salePrice);
};

export const contractCall_buy = async (nft, salePrice, contractAddress, chainId) => {
  const contract = await getWriteableContract(contractAddress, chainId);
  try {
    const tx = await contract.buy(nft.tokenId, {value: salePrice});
    return { tx };
  } catch (error) {
    return { error: error.message };
  }
};

