import { useEffect, useState } from "react";
import { ethers } from "ethers";

import Mint from '@components/clientside/Mint'
import Buy from '@components/clientside/Buy'
import Sell from '@components/clientside/Sell'
import Transfer from '@components/clientside/Transfer'

import styles from '@components/Nft.module.css'

import {
	networkName,
	getWallet,
	contractCall_ownerOf,
	contractCall_mintable
} from "@utils/ethereum-interact.js";

import {
	etherscanAddressLink,
	etherscanTxLink
} from "@utils/links.js"

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
			await contractCall_mintable(nft, contractAddress, chainId) ?
				setStatus("mintable") :
				setStatus("burntOrRevoked")
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
			window.ethereum.on("accountsChanged", () => {
				fetchWallet();
				updateTokenStatus();
			});
			window.ethereum.on("chainChanged", () => {
				window.location.reload();
			});
		}
	}

	async function doConnectWallet (e)  {
		e && e.preventDefault();
		await fetchWallet(true)
	};

	function showNofity () {
		switch (notify) {
			case "insufficient_funds":
				return <div>You have insufficient funds in your wallet</div>

			case "tx_pending":
				return <div>{"Be patient while transaction "}{etherscanTxLink(tx.hash)}{" is added to the blockchain..."}</div>

			case "tx_succeded":
				return <div>{"Done! Transaction "}{etherscanTxLink(tx.hash)}{" was succesful"}</div>

			case "tx_failed":
				return <div>{"Sorry, transaction "}{etherscanTxLink(tx.hash)}{" failed"}</div>

			case "confirmation_pending":
				return <div>{"Confirm this using your wallet..."}</div>

			case "wallet_unavailable":
				return (
					<div>
						<div>
							To mint or buy NFTs you need an Ethereum wallet
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
				{"To establish the status of this NFT, please switch your wallet to network: "}{networkName(chainId)}
			</div>

		: !status ?
			<div className={styles.nftStatusPending}>
				Checking NFT status …
			</div>

		:
		<div className={styles.nftStatus}>

			{owner &&
				<div className={styles.nftOwner}>
					{"This NFT is owned by "}
					{etherscanAddressLink(owner, userIsOwner && "you")}
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

			{status === "minted" && userIsNotOwner && !connecting &&
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

			{status === "burntOrRevoked" && (
				<div>Sorry, this NFT has been burnt or revoked.</div>
			)}

			<div className={`${styles.notification} ${(notify + "").includes("_pending") && styles.notificationPending}`}>
				{notify ? showNofity()

				: walletAddress ?
					<div>Your wallet address is{" "}{etherscanAddressLink(walletAddress)}</div>

				: window.ethereum ?
					<div>{"Connect your "}<a href="" onClick={doConnectWallet}>Ethereum wallet</a></div>

				: <></>}
			</div>
		</div>
	);
};

export default NftStatus;