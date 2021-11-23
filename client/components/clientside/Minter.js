import { useState } from "react";
import { ethers } from "ethers";

import {
	isTransactionMined,
	contractCall_mint
} from "@utils/ethereum-interact.js";

import styles from '@components/Nft.module.css'

export default function Minter({
	nft,
	doConnectWallet,
	walletAddress,
	setOwner,
	setNotify,
	setTx,
	contractAddress,
	chainId }) {

	const [connecting, setConnecting] = useState();

	const doMint = async (e) => {
		if (!window.ethereum) return;
		setNotify("confirmation_required");
		setConnecting(true);
		if (!walletAddress) await doConnectWallet();
		try {
			const { tx, error } = await contractCall_mint(nft, contractAddress, chainId);
			if (tx) {
				setTx(tx);
				setNotify("tx_pending");
				const txReceipt = await isTransactionMined(tx.hash, chainId)
				if (txReceipt) {
					setNotify("tx_succeded");
					setOwner(walletAddress);
				} else {
					setNotify("tx_failed");
				}
			} else {
				setNotify(error.includes("insufficient funds") ? "insufficient_funds" : error);
			}
		} catch (error) {
			setNotify(error.message);
		}
		setConnecting(false);
	};

	return <>
		<div>
			<div>This NFT is available for minting</div>
			<img className={styles.ethereumLogo} src="/ethereum.svg" />
			<span className={styles.nftPriceETH}>
				{nft.weiPrice === "0" ?
					"FREE" :
					`${ethers.utils.formatEther(nft.weiPrice)} ETH`
				}
			</span>
			<span className={styles.nftPriceGas}>{" + gas fee"}</span>
		</div>
		<div id="walletActions">
			<button onClick={doMint} disabled={connecting || !window.ethereum}>
				Mint this NFT
			</button>
		</div>
	</>
}