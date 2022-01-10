import { useState, useEffect } from "react";
import { ethers } from "ethers";

import { chainParams, marketplaces } from "@utils/chain-spec.js";
import {
	isTransactionMined,
	contractCall_price,
	contractCall_buy
} from "@utils/ethereum-interact.js";

import styles from '@components/Nft.module.css'

export default function Buy({
	nft,
	doConnectWallet,
	walletAddress,
	setOwner,
	setNotify,
	setTx,
	connecting,
	setConnecting,
	forceRender,
	contractAddress,
	chainId }) {

	const [price, setPrice] = useState();
	const [priceETH, setPriceETH] = useState();

	useEffect(() => {
		getPrice();
		return () => {
			setPrice();
			setPriceETH();
		};
	}, []);

	async function getPrice() {
		const _price = await contractCall_price(nft, contractAddress, chainId);
		setPrice(_price);
		const _priceETH = ethers.utils.formatEther(_price);
		setPriceETH(_priceETH);
	}

	const contractBuy = async (e) => {
		if (!window.ethereum) return;
		setNotify("confirmation_pending");
		setConnecting(true);
		if (!walletAddress) await doConnectWallet();
		try {
			const { tx, error } = await contractCall_buy(nft, price, contractAddress, chainId);
			if (tx) {
				setTx(tx);
				setNotify("tx_pending");
				const txReceipt = await isTransactionMined(tx.hash, chainId)
				if (txReceipt) {
					setNotify("tx_succeded");
					setOwner(walletAddress);
					forceRender(Math.random());
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

	return (
		<div>
			{priceETH > 0 &&
				<div>
					{"Price : "}
					<span className={styles.nftPriceETH}>
						{priceETH}{" "}{chainParams(chainId).nativeCurrency.symbol}
					</span>
					<span className={styles.nftPriceGas}>{" + gas fee"}</span>
					<button onClick={contractBuy} disabled={connecting || !window.ethereum} >
						Buy now
					</button>
				</div>
			}
			<div>
				{marketplaces(chainId, contractAddress, nft.tokenId, "View on ")}
			</div>
		</div>
	);
}