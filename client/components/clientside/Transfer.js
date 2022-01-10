import { useState, useEffect } from "react";
import { ethers } from "ethers";

import {
	isTransactionMined,
	contractCall_safeTransferFrom
} from "@utils/ethereum-interact.js";

import styles from '@components/Nft.module.css'

export default function Transfer({
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

	const [recipient, setRecipient] = useState("");
	const [expanded, setExpanded] = useState();

	useEffect(() => {
		return () => {
			setRecipient();
			setExpanded();
		};
	}, []);

	const cancel = (evt) => {
		evt.preventDefault();
		setExpanded(false);
		setNotify();
	}

	const submit = (evt) => {
		evt.preventDefault();
		doTransfer()
	}

	const expand = (evt) => {
		evt.preventDefault();
		setRecipient("");
		setExpanded(true);
	}

	const doTransfer = async () => {
		if (!walletAddress) await doConnectWallet();
		if (!ethers.utils.isAddress(recipient)) {
			setNotify("invalid_address");
			return;
		}
		if (ethers.utils.getAddress(walletAddress) === ethers.utils.getAddress(recipient)) {
			setNotify("transfer_to_self");
			return;
		}
		setNotify("confirmation_pending");
		setConnecting(true);
		try {
			const { tx, error } = await contractCall_safeTransferFrom(nft, walletAddress, recipient, contractAddress, chainId);
			if (tx) {
				setTx(tx);
				setNotify("tx_pending");
				const txReceipt = await isTransactionMined(tx.hash, chainId)
				if (txReceipt) {
					setNotify("tx_succeded")
					setOwner(recipient);
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

	return (
		<div>
			{expanded &&
				<form>
					{"Transfer to address:"}
					<input
						className={styles.bigInput}
						disabled={connecting}
						autoFocus
						type="string"
						value={recipient}
						onChange={e => setRecipient(e.target.value)}
					/>
					<div className={styles.formActions}>
						<button onClick={submit} disabled={connecting || !recipient}>OK</button>
						<button  className={styles.secondary} onClick={cancel} disabled={connecting}>Cancel</button>
					</div>
				</form>
			}

			{!expanded &&
				<div>
					<a href="" onClick={expand} title="transfer this NFT to another address">Transfer</a>{" to another address"}
				</div>
			}
		</div>
	);
}