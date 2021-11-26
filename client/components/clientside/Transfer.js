import { useState, useEffect } from "react";
import { ethers } from "ethers";

import Link from 'next/link'
import {
	isTransactionMined,
	contractCall_safeTransferFrom
} from "@utils/ethereum-interact.js";

import {
	etherscanAddressLink
} from "@utils/links.js"

import styles from '@components/Nft.module.css'

export default function Transfer({
	nft,
	owner,
	doConnectWallet,
	walletAddress,
	setOwner,
	setNotify,
	setTx,
	forceRender,
	contractAddress,
	chainId }) {

	const [expanded, setExpanded] = useState();
	const [connecting, setConnecting] = useState();
	const [recipient, setRecipient] = useState("");

	const userIsOwner = (owner && walletAddress && (owner.toUpperCase() === walletAddress.toUpperCase()));

	const cancel = (evt) => {
		evt.preventDefault();
		setExpanded(false);
	}

	const submit = (evt) => {
		evt.preventDefault();
		doTransfer()
	}

	const expand = (evt) => {
		evt.preventDefault();
		setExpanded(true);
	}

	const doTransfer = async () => {
		if (!walletAddress) await doConnectWallet();
		console.log(walletAddress, owner, userIsOwner)
		if (!userIsOwner) return;
		setNotify("confirmation_required");
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
			{userIsOwner && expanded &&
				<form>
					{"Transfer to "}
					<input disabled={connecting}
						autoFocus
						type="string"
						value={recipient}
						onChange={e => setRecipient(e.target.value)}
					/>
					<div className={styles.formActions}>
						<button className={styles.buttony} onClick={submit} disabled={connecting || !recipient}>OK</button>
						<button className={styles.buttony} onClick={cancel} disabled={connecting}>Cancel</button>
					</div>
				</form>
			}

			{userIsOwner && !expanded &&
				<div>
					· <a href="" onClick={expand}>Transfer</a> it
				</div>
			}
		</div>
	);
}