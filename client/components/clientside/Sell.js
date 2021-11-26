import { useState, useEffect } from "react";
import { ethers } from "ethers";

import Link from 'next/link'
import {
	isTransactionMined,
	contractCall_price,
	contractCall_setPrice
} from "@utils/ethereum-interact.js";

import styles from '@components/Nft.module.css'

export default function Sell({
	nft,
	setNotify,
	setTx,
	connecting,
	setConnecting,
	forceRender,
	contractAddress,
	chainId }) {

	const [priceETH, setPriceETH] = useState();
	const [displayPriceETH, setDisplayPriceETH] = useState();
	const [expanded, setExpanded] = useState();

	useEffect(() => {
		async function getPrice() {
			const _price = await contractCall_price(nft, contractAddress, chainId);
			const _priceETH = ethers.utils.formatEther(_price);
			setPriceETH(_priceETH);
			setDisplayPriceETH(_priceETH);
		}
		getPrice();

		return () => {
			setPriceETH();
			setDisplayPriceETH();
			setExpanded();
		};
	}, []);

	const cancel = (evt) => {
		evt.preventDefault();
		setExpanded(false);
		setDisplayPriceETH(priceETH);
	}

	const submit = (evt) => {
		evt.preventDefault();
		contractSetPrice(displayPriceETH)
	}

	const setZero = (evt) => {
		evt.preventDefault();
		setDisplayPriceETH("0")
		contractSetPrice("0");
	}

	const expand = (evt) => {
		evt.preventDefault();
		setExpanded(true);
	}

	const marketplaces = () => {
		return <span className={styles.marketplaces}>
			<Link href={nft.openseaAsset}><a className={styles.nftMarket}>OpenSea</a></Link>
			{" or "}
			<Link href={nft.raribleAsset}><a className={styles.nftMarket}>Rarible</a></Link>
		</span>
	}

	const contractSetPrice = async (newPriceETH) => {
		newPriceETH = newPriceETH || '0';
		if (newPriceETH != priceETH) {
			const newPrice = ethers.utils.parseEther(newPriceETH);
			setNotify("confirmation_pending");
			setConnecting(true);
			try {
				const { tx, error } = await contractCall_setPrice(nft, newPrice, contractAddress, chainId);
				if (tx) {
					setTx(tx);
					setNotify("tx_pending");
					const txReceipt = await isTransactionMined(tx.hash, chainId)
					if (txReceipt) {
						setNotify("tx_succeded")
						setDisplayPriceETH(newPriceETH);
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
			setExpanded(false);
			setConnecting(false);
		}
	}

	return (
		<div>
			{expanded &&
				<form>
					{"Sell for "}
					<input disabled={connecting}
						autoFocus
						type="string"
						value={displayPriceETH}
						onChange={e => setDisplayPriceETH(e.target.value)}
					/>
					{" ETH "}
					<div className={styles.formActions}>
						<button className={styles.buttony} onClick={submit} disabled={connecting || parseFloat(priceETH) === parseFloat(displayPriceETH)}>OK</button>
						<button className={styles.buttony} onClick={cancel} disabled={connecting}>Cancel</button>
					</div>
				</form>
			}

			{!expanded && priceETH == 0 &&
				<div>
					<button onClick={expand}>
						Set a sale price
					</button>
					{"· Trade it on "}
					{marketplaces()}
				</div>
			}

			{!expanded && priceETH > 0 &&
				<>
					<img className={styles.ethereumLogo} src="/ethereum.svg" />
					<span className={styles.nftPriceETH}>
						{priceETH}{" ETH"}
					</span>
					<span className={styles.nftPriceGas}>{" + gas fee"}</span>
					<form>
						<button className={styles.buttony} onClick={expand} disabled={connecting}>Change price</button>
						{parseFloat(priceETH) > 0 &&
							<button className={styles.buttony} onClick={setZero} disabled={connecting}>End sale</button>
						}
					</form>
					<div>
						{"· Sell it on "}
						{marketplaces()}
					</div>
				</>
			}

		</div>
	);
}