import { useEffect, useState } from "react";
import { ethers } from "ethers";

import Mint from '@components/clientside/Mint'
import Buy from '@components/clientside/Buy'
import Sell from '@components/clientside/Sell'
import Transfer from '@components/clientside/Transfer'

import styles from '@components/Nft.module.css'

import {
	getWallet,
	contractCall_ownerOf,
	contractCall_mintable
} from "@utils/ethereum-interact.js";

import {
	chainParams,
	switchChain,
	explorerAddressLink,
	explorerTxLink
} from "@utils/chain-spec.js";

const NftStatus = ({ nft, context }) => {
	const [status, setStatus] = useState(nft.status);
	const [walletAddress, setWallet] = useState();
	const [owner, setOwner] = useState();
	const [tx, setTx] = useState();
	const [chainIdMismatch, setChainIdMismatch] = useState();
	const [notify, setNotify] = useState();
	const [connecting, setConnecting] = useState();
	const [render, forceRender] = useState();

	const contractAddress = context.contractAddress;
	const chainId = context.chainId;
	const chainName = chainParams(chainId).chainName;
	const coin = chainParams(chainId).nativeCurrency.symbol;

	const userIsOwner = (walletAddress && owner && (ethers.utils.getAddress(walletAddress) === ethers.utils.getAddress(owner)));
	const userIsNotOwner = (walletAddress && owner && (ethers.utils.getAddress(walletAddress) !== ethers.utils.getAddress(owner)));

	useEffect(() => {
		fetchWallet();
		updateTokenStatus();
		addWalletListener();
		return () => {
			setWallet();
			setOwner();
			setTx();
			setChainIdMismatch();
			setNotify();
			setConnecting();
			forceRender();
			removeWalletListener();
		}
	}, [render]);

	async function updateTokenStatus() {
		const _owner = await contractCall_ownerOf(nft, contractAddress, chainId);
		if (_owner) {
			setStatus("minted");
			setOwner(_owner);
		} else if (!nft.signature) {
			setStatus("withheld");
		} else {
			const mintableStatus = await contractCall_mintable(nft, contractAddress, chainId);
			setStatus(mintableStatus);
		}
	}

	async function fetchWallet(isConnect) {
		const { address, walletChainId, error } = await getWallet(isConnect);
		if (walletChainId && walletChainId !== chainId) {
			setChainIdMismatch(true);
		} else if (address) {
			setWallet(address);
		} else {
			setNotify(error);
		}
	}

	async function addWalletListener() {
		if (window.ethereum) {
			window.ethereum.on("accountsChanged", reloadApp);
			window.ethereum.on("chainChanged", reloadApp);
		}
	}

	async function removeWalletListener() {
		if (window.ethereum) {
			window.ethereum.removeListener("accountsChanged", reloadApp);
			window.ethereum.removeListener("chainChanged", reloadApp);
		}
	}

	function reloadApp() {
		window.location.reload();
	}

	async function doConnectWallet(e) {
		e && e.preventDefault();
		await fetchWallet(true)
	};

	async function doSwitchChain(e) {
		e && e.preventDefault();
		await switchChain(chainId);
	}

	function showNofity() {
		switch (notify) {
			case "insufficient_funds":
				return <div>You have insufficient funds in your wallet</div>

			case "tx_pending":
				return <div>{"Be patient. Transaction "}{explorerTxLink(chainId, tx.hash)}{" is being mined on the "}{chainName}{" blockchain..."}</div>

			case "tx_succeded":
				return <div>{"Done! Transaction "}{explorerTxLink(chainId, tx.hash)}{" was succesful"}</div>

			case "tx_failed":
				return <div>{"Sorry, transaction "}{explorerTxLink(chainId, tx.hash)}{" failed"}</div>

			case "confirmation_pending":
				return <div>{"Confirm this using your wallet..."}</div>

			case "transfer_to_self":
				return <div>{"You are already the owner!"}</div>

			case "invalid_address":
				return <div>{"That is not a valid "}{chainName}{" address"}</div>

			case "wallet_unavailable":
				return (
					<div>
						<div>
							{"To mint or buy NFTs you need a wallet funded with "}{coin}
						</div>
						<div>
							On mobile use the <a href={`https://metamask.io/`}>Metamask</a> app broswer to view this website
						</div>
						<div>
							On desktop enable the <a href={`https://metamask.io/`}>Metamask</a> browser extension
						</div>
					</div>)

			default:
				return <div>{notify}</div>
		}
	}

	return (
		chainIdMismatch ?
			<div className={styles.notification}>
				{"To establish the status of this NFT, please "}
				<a href="" onClick={doSwitchChain}>
					{"switch your wallet's network to "}
					{chainName}
				</a>
			</div>

			: !status ?
				<div className={styles.nftStatusPending}>
					Checking status …
				</div>

				:
				<div className={styles.nftStatus}>

					{owner && userIsOwner &&
						<div className={styles.nftOwner}>
							{explorerAddressLink(chainId, owner, "You")}{" own this NFT"}
						</div>
					}

					{owner && !userIsOwner &&
						<div className={styles.nftOwner}>
							{"Owned by user "}
							{explorerAddressLink(chainId, owner)}
						</div>
					}

					{status === "minted" && userIsOwner && !connecting &&
						<>
							<Sell
								nft={nft}
								setNotify={setNotify}
								setTx={setTx}
								connecting={connecting}
								setConnecting={setConnecting}
								forceRender={forceRender}
								contractAddress={contractAddress}
								chainId={chainId} />

							<Transfer
								nft={nft}
								doConnectWallet={doConnectWallet}
								walletAddress={walletAddress}
								setOwner={setOwner}
								setNotify={setNotify}
								setTx={setTx}
								connecting={connecting}
								setConnecting={setConnecting}
								forceRender={forceRender}
								contractAddress={contractAddress}
								chainId={chainId} />
						</>
					}

					{status === "minted" && (userIsNotOwner || !walletAddress) && !connecting &&
						<Buy
							nft={nft}
							owner={owner}
							doConnectWallet={doConnectWallet}
							walletAddress={walletAddress}
							setOwner={setOwner}
							setNotify={setNotify}
							setTx={setTx}
							connecting={connecting}
							setConnecting={setConnecting}
							forceRender={forceRender}
							contractAddress={contractAddress}
							chainId={chainId} />
					}

					{status === "mintable" && !connecting &&
						<Mint
							nft={nft}
							doConnectWallet={doConnectWallet}
							walletAddress={walletAddress}
							setOwner={setOwner}
							setNotify={setNotify}
							setTx={setTx}
							connecting={connecting}
							setConnecting={setConnecting}
							forceRender={forceRender}
							contractAddress={contractAddress}
							chainId={chainId} />
					}

					{status === "withheld" && (
						<div>This NFT is reserved. Please contact the artist.</div>
					)}

					{status === "unavailable" && (
						<div>Sorry, this NFT has been withdrawn from sale or burnt by the owner.</div>
					)}

					{status === "unknown" && (
						<div>Sorry, it wasn't possible to get this NFT's status. Couldn't connect to the {chainName} blockchain.</div>
					)}

					<div className={`${styles.notification} ${(notify + "").includes("_pending") && styles.notificationPending}`}>
						{notify ? showNofity()

							: walletAddress ?
								<div>{"You are connected as "}{explorerAddressLink(chainId, walletAddress)}</div>

								: window.ethereum ?
									<div>{"Connect your "}<a href="" onClick={doConnectWallet}>{coin}{" ("}{chainName}{") wallet"}</a></div>

									: <></>}
					</div>
				</div>
	);
};

export default NftStatus;
