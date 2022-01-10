import { useState } from "react";
import { ethers } from "ethers";

import { chainParams } from "@utils/chain-spec.js";
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
	forceRender,
	contractAddress,
	chainId }) {

	const [connecting, setConnecting] = useState();

	const doMint = async (e) => {
		if (!window.ethereum) return;
		setNotify("confirmation_pending");
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
					forceRender(Math.random())
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
		<div>This NFT is available for minting</div>
		<div>
			<span>Price : </span>
			<span className={styles.nftPriceETH}>
				{nft.weiPrice === "0" ?
					"FREE" :
					`${ethers.utils.formatEther(nft.weiPrice)} ${chainParams(chainId).nativeCurrency.symbol}`
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