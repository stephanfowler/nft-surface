import Link from 'next/link'

export function chainParams(chainId) {
	// Use exact parameters from https://chainlist.org/ or Metamask will show users a warning
	// You only need full parameters for chains that are NOT already in Metamask by default (eg ETH mainnet/rinkeby/...)
	const spec = {
		"1": { chainName: "Ethereum Mainnet", nativeCurrency: { symbol: "ETH" } },
		"4": { chainName: "Rinkeby Testnet", nativeCurrency: { symbol: "ETH" } },
		"31337": {
			chainId: "0x7a69",
			chainName: "Localhost 8545",
			nativeCurrency: {
				name: "Ether",
				symbol: "ETH",
				decimals: 18
			},
			rpcUrls: ["http://localhost:8545"]
		},
		"80001": {
			chainId: "0x13881",
			chainName: "Polygon Testnet Mumbai",
			nativeCurrency: {
				name: "Polygon",
				symbol: "MATIC",
				decimals: 18
			},
			rpcUrls: ["https://matic-mumbai.chainstacklabs.com"],
			blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
		},
		"421611": {
			chainId: "0x66eeb",
			chainName: "Arbitrum Testnet Rinkeby",
			nativeCurrency: {
				name: "Arbitrum Ether",
				symbol: "ARETH",
				decimals: 18
			},
			rpcUrls: ["https://rinkeby.arbitrum.io/rpc"],
			blockExplorerUrls: ["https://rinkeby-explorer.arbitrum.io/"]
		}
	}
	return spec[chainId.toString()] || { chainName: "Unknown", nativeCurrency: { symbol: "Unknown" } };
}

function explorerTemplates(chainId) {
	const links = {
		"1": {
			address: 'https://etherscan.io/address/<address>',
			token: 'https://etherscan.io/token/<address>?a=<tokenId>',
			transaction: 'https://etherscan.io/tx/<hash>'
		},
		"4": {
			address: 'https://rinkeby.etherscan.io/address/<address>',
			token: 'https://rinkeby.etherscan.io/token/<address>?a=<tokenId>',
			transaction: 'https://rinkeby.etherscan.io/tx/<hash>'
		},
		"137": {
			address: 'https://polygonscan.com/address/<address>',
			token: 'https://polygonscan.com/token/<address>?a=<tokenId>',
			transaction: 'https://polygonscan.com/tx/<hash>'
		},
		"80001": {
			address: 'https://mumbai.polygonscan.com/address/<address>',
			token: 'https://mumbai.polygonscan.com/token/<address>?a=<tokenId>',
			transaction: 'https://mumbai.polygonscan.com/tx/<hash>'
		},
		"421611": {
			address: 'https://testnet.arbiscan.io/address/<address>',
			token: 'https://testnet.arbiscan.io/token/<address>?a=<tokenId>',
			transaction: 'https://testnet.arbiscan.io/tx/<hash>'
		}
	}
	return links[chainId + ""] || {};
}

function marketplaceTemplates(chainId) {
	const links = {
		"1": {
			OpenSea: 'https://opensea.io/assets/<address>/<tokenId>',
			Rarible: 'https://rarible.com/token/<address>:<tokenId>'
		},
		"4": {
			OpenSea: 'https://testnets.opensea.io/assets/<address>/<tokenId>',
			Rarible: 'https://rinkeby.rarible.com/token/<address>:<tokenId>'
		},
		"137": {
			OpenSea: 'https://opensea.io/polygon/assets/<address>/<tokenId>'
		},
		"80001": {
			OpenSea: 'https://testnets.opensea.io/assets/mumbai/<address>/<tokenId>'
		},
		"421611": {}
	}
	return links[chainId + ""] || {};
}

export const switchChain = async (chainId) => {
	const chainIdHex = "0x" + chainId.toString(16);
	try {
		await window.ethereum.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: chainIdHex }],
		});
	} catch (switchError) {
		// This error code indicates that the chain has not been added to MetaMask.
		//if (switchError.code === 4902) {
			const params = chainParams(chainId);
			if (params) {
				try {
					await window.ethereum.request({
						method: 'wallet_addEthereumChain',
						params: [params],
					});
				} catch (addError) {
					// handle "add" error
				}
			}
		//}
		// handle other "switch" errors
	}
}

export function marketplaces(chainId, contractAddress, tokenId, preamble) {
	const markets = marketplaceTemplates(chainId);
	return Object.keys(markets).map((market, index) => {
		return <span key={index}>
			{index === 0 && preamble}
			{index > 0 && " or "}
			<Link href={(markets[market]).replace("<address>", contractAddress).replace("<tokenId>", tokenId)}>
				<a target="_blank" title={"go to " + market + " NFT marketplace"}>{market}</a>
			</Link>
		</span>
	});
}

function shortAddress(address) {
	const l = 4; // chars displayed from top/tail of address
	const a = (address || "").toLowerCase();
	return a.substr(0, l + 2) + "…" + a.substr(a.length - l);
}

export function explorerAddressLink(chainId, address, linktext) {
	const template = explorerTemplates(chainId).address || "";
	return (
		<Link href={template.replace("<address>", address)}>
			<a title="view address on a blockchain explorer" target="_blank">{linktext || shortAddress(address)}</a>
		</Link>)
}

export function explorerTokenLink(chainId, contractAddress, tokenId) {
	const template = explorerTemplates(chainId).token || "";
	return (
		<Link href={template.replace("<address>", contractAddress).replace("<tokenId>", tokenId)}>
			<a title="view token on a blockchain explorer" target="_blank">{tokenId}</a>
		</Link>)
}

export function explorerTxLink(chainId, hash) {
	const template = explorerTemplates(chainId).transaction || "";
	return (
		<Link href={template.replace("<hash>", hash)}>
			<a title="view transaction on a blockchain explorer" target="_blank">{shortAddress(hash)}</a>
		</Link>)
}

export function ipfsLink(ipfsURI, linkText) {
	let href = ipfsURI;
	const template = process.env.ipfsGateway;
	if (template) {
		const ipfsHash = (ipfsURI || "").replace("ipfs://", "");
		href = (template || "").replace("<ipfsHash>", ipfsHash);
	}
	return (
		<Link href={href}>
			<a title="view file on IPFS">{linkText || "IPFS"}</a>
		</Link>)
}

