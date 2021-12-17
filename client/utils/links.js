import Link from 'next/link'

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
		}
	}
	return links[chainId + ""] || {};
}

export function marketplaces(chainId, contractAddress, tokenId, preamble) {
	const markets = marketplaceTemplates(chainId);
	return Object.keys(markets).map((market, index) =>
		<>
			{index === 0 && preamble}
			{index > 0 && " / "}
			<Link key={index} href={(markets[market]).replace("<address>", contractAddress).replace("<tokenId>", tokenId)}>
				<a title={"go to " + market + " NFT marketplace"}>{market}</a>
			</Link>
		</>
	);
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

