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
	if (window.ethereum) {
		const provider = await new ethers.providers.Web3Provider(window.ethereum, "any");
		const contract = new ethers.Contract(contractAddress, contractABI, provider).connect(provider.getSigner());
		return contract;
	}
}

function errorMessage(error) {
	const e = error || "Error";
	return (e.data && e.data.message) || e.message || e;
}

export const isTransactionMined = async (txHash, chainId) => {
	const provider = await getReadableProvider(chainId);
	const txReceipt = await provider.waitForTransaction(txHash);
	if (txReceipt && txReceipt.blockNumber) {
		return txReceipt;
	}
	;
}

export const getWallet = async (isConnect) => {
	if (window.ethereum) {
		try {
			const accounts = await window.ethereum.request({ method: isConnect ? 'eth_requestAccounts' : 'eth_accounts' });
			const network = await new ethers.providers.Web3Provider(window.ethereum).getNetwork();
			return {
				address: accounts[0],
				walletChainId: network.chainId
			};
		} catch (error) {
			return { error: error.message };
		}
	} else {
		return { error: "wallet_unavailable" };
	}
};

export const contractCall_ownerOf = async (nft, contractAddress, chainId) => {
	const contract = await getReadableContract(contractAddress, chainId);
	try {
		const owner = await contract.ownerOf(nft.tokenId);
		return owner;
	} catch (error) {
		return null;
	}
};

export const contractCall_mintable = async (nft, contractAddress, chainId) => {
	const contract = await getReadableContract(contractAddress, chainId);
	try {
		await contract.mintable(nft.weiPrice, nft.tokenId, nft.tokenURI, nft.signature);
		return "mintable";
	} catch (error) {
		if (error.message && error.message.includes("execution reverted:")) {
			return "unavailable";
		}
		return "unknown";
	}
};

export const contractCall_mint = async (nft, contractAddress, chainId) => {
	const contract = await getWriteableContract(contractAddress, chainId);
	try {
		const tx = await contract.mint(nft.tokenId, nft.tokenURI, nft.signature, { value: nft.weiPrice });
		return { tx };
	} catch (e) {
		return { error: errorMessage(e) };
	}
};

export const contractCall_price = async (nft, contractAddress, chainId) => {
	const contract = await getReadableContract(contractAddress, chainId);
	return await contract.price(nft.tokenId);
};

export const contractCall_setPrice = async (nft, salePrice, contractAddress, chainId) => {
	const contract = await getWriteableContract(contractAddress, chainId);
	try {
		const tx = await contract.setPrice(nft.tokenId, salePrice);;
		return { tx };
	} catch (e) {
		return { error: errorMessage(e) };
	}
};

export const contractCall_buy = async (nft, salePrice, contractAddress, chainId) => {
	const contract = await getWriteableContract(contractAddress, chainId);
	try {
		const tx = await contract.buy(nft.tokenId, { value: salePrice });
		return { tx };
	} catch (e) {
		return { error: errorMessage(e) };
	}
};

export const contractCall_safeTransferFrom = async (nft, from, to, contractAddress, chainId) => {
	const contract = await getWriteableContract(contractAddress, chainId);
	try {
		const tx = await contract.safeTransferFrom(from, to, nft.tokenId);
		return { tx };
	} catch (e) {
		return { error: errorMessage(e) };
	}
};
