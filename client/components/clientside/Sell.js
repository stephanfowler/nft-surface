import { useState, useEffect } from "react";
import { ethers } from "ethers";

import { chainParams, marketplaces } from "@utils/chain-spec.js";
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
			const _priceETH = parseFloat(ethers.utils.formatEther(_price));
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
		setNotify();
		setDisplayPriceETH(priceETH);
	}

	const submit = (evt) => {
		evt.preventDefault();
		contractSetPrice(displayPriceETH)
	}

	const setZero = (evt) => {
		evt.preventDefault();
		contractSetPrice("0");
	}

	const expand = (evt) => {
		evt.preventDefault();
		setDisplayPriceETH(priceETH || "");
		setExpanded(true);
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
					<div className={styles.nftDetails}>
						Important: prices are recorded on-chain, so setting or changing a price will incur a transaction fee.
					</div>
					<div>
						{"Sell for "}
						<input disabled={connecting}
							autoFocus
							type="number"
							value={displayPriceETH}
							onChange={e => setDisplayPriceETH(e.target.value)}
						/>
						{" "}{chainParams(chainId).nativeCurrency.symbol}
					</div>
					<div className={styles.formActions}>
						<button onClick={submit} disabled={connecting || (parseFloat(priceETH) === parseFloat(displayPriceETH || "0"))}>OK</button>
						{parseFloat(priceETH) > 0 &&
							<button className={styles.secondary} onClick={setZero} disabled={connecting}>End sale</button>
						}
						<button className={styles.secondary} onClick={cancel} disabled={connecting}>Cancel</button>
					</div>
				</form>
			}

			{!expanded && priceETH == 0 &&
				<div>
					<button onClick={expand}>
						Set a sale price
					</button>
				</div>
			}

			{!expanded && priceETH > 0 &&
				<>
					<div>Direct sale price :</div>
					<span className={styles.nftPriceETH}>
						{priceETH}{" "}{chainParams(chainId).nativeCurrency.symbol}
					</span>
					<span className={styles.nftPriceGas}>{" + gas fee"}</span>
					<form>
						<button className={styles.secondary} onClick={expand} disabled={connecting}>Change price</button>
					</form>
				</>
			}

			{!expanded &&
				<div>
					{marketplaces(chainId, contractAddress, nft.tokenId, "Sell on ")}
				</div>
			}

		</div>
	);
}