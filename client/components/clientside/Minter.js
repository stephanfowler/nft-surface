import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { 
  networkName,
  isTransactionMined,
  getWallet,
  connectWallet,
  contractCall_ownerOf,
  contractCall_mintable,
  contractCall_mint
} from "@utils/ethereum-interact.js";

import Link from 'next/link'
import SalesForm from '@components/clientside/SalesForm'
import ShortAddress from '@components/ShortAddress'

import styles from '@components/Nft.module.css'

const Minter = ({ nft, chainId, status, setStatus }) => {
  const [walletAddress, setWallet] = useState();
  const [statusUpdated, setStatusUpdated] = useState();
  const [owner, setOwner] = useState();
  const [alert, setAlert] = useState();
  const [tx, setTx] = useState();
  const [txReceipt, setTxReceipt] = useState();
  const [isConnecting, setIsConnecting] = useState();
  const [chainIdMismatch, setChainIdMismatch] = useState();

  const userIsOwner = (owner && walletAddress && (owner.toUpperCase() === walletAddress.toUpperCase()));
  const contractAddress = nft.metadata.contractAddress;

  useEffect(() => {
    async function fetchWallet() {
      const wallet = await getWallet();
      setWallet(wallet.address);
      setChainIdMismatch(wallet.chainId && wallet.chainId !== chainId);
      setAlert(wallet.error);
    }
    fetchWallet();

    async function updateTokenStatus() {
      const _owner = await contractCall_ownerOf(nft, contractAddress, chainId);
      if (_owner) {
        setStatus("minted")
        setOwner(_owner);
      } else if (status === "minted") {
        setStatus("burntOrRevoked");

      } else if (status === "mintable") {
          await contractCall_mintable(nft, contractAddress, chainId) ?
            setStatus("mintable_confirmed") :
            setStatus("burntOrRevoked")
      }
      setStatusUpdated(true);
    }
    updateTokenStatus();

    async function addWalletListener() {
      if (window.ethereum) {
        window.ethereum.on("accountsChanged", () => {
          setAlert();
          fetchWallet();
          updateTokenStatus();
        });
        window.ethereum.on("chainChanged", () => {
          window.location.reload();
        });
      }
    }
    addWalletListener();

    return () => {
      setStatus();
      setOwner();
      setWallet();
      setAlert();
    }
  }, []);

  const doConnectWallet = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setAlert();
    const wallet = await connectWallet();
    setWallet(wallet.address);
    setChainIdMismatch(wallet.chainId && wallet.chainId !== chainId);
    setAlert(wallet.error );
    setIsConnecting(false);
  };

  const doMint = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setAlert();
    const { tx, error } = await contractCall_mint(nft, contractAddress, chainId);
    if (tx) {
      setTx(tx);
      setStatus("mint_pending")
      const txReceipt = await isTransactionMined(tx.hash, chainId)
      if (txReceipt) {
        setTxReceipt(txReceipt);
        setOwner(walletAddress);
        setStatus("minted");
      } else {
        setAlert("NOT Mined, transaction: " + tx.hash)
      }
    } else {
      console.log(error);
    }
    setIsConnecting(false);
  };

  function etherscanAddressLink(address, linktext) {
    return (
      <Link href={(process.env.etherscanAddress || "").replace("<address>", address)}>
        <a target="_blank">{linktext || <ShortAddress address={address} />}</a>
      </Link>)
  }

  function etherscanTxLink(hash) {
    return (
      <Link href={(process.env.etherscanTx || "").replace("<hash>", hash)}>
        <a target="_blank"><ShortAddress address={hash} /></a>
      </Link>)
  }

  function etherscanBlockLink(number) {
    return (
      <Link href={(process.env.etherscanBlock || "").replace("<number>", number)}>
        <a target="_blank">{number}</a>
      </Link>)
  }

  return (
    !nft ?
      <div>No matching NFT is listed</div>
    : 
    chainIdMismatch ?
        <div className={styles.walletInstallInstructions}>
          {"To establish the status of this NFT, please switch your wallet to network: "}{networkName(chainId)}
        </div>
    :
    <div className={statusUpdated ? styles.minter_updated : styles.minter }>

      {owner && userIsOwner && (
        <div className={styles.nftOwner}>
          This NFT is owned by{" "}{etherscanAddressLink(owner, "you")}
        </div>
      )}

      {owner && !userIsOwner && (
        <div className={styles.nftOwner}>
          This NFT is owned by {" "}{etherscanAddressLink(owner)}
        </div>
      )}

      {owner && (
        <SalesForm nft={nft} walletAddress={walletAddress} userIsOwner={userIsOwner} setOwner={setOwner} contractAddress={contractAddress} chainId={chainId} />
      )}

      {status === "minted" && !owner && (
        <div className={styles.waiting}>
          Confirming NFT ownership …
        </div>
      )}

      {status === "mint_pending" && (
        <div className={styles.mintingPending}>
          This NFT is being minted for you, please be patient!
          Pending transaction is : {etherscanTxLink(tx.hash)}
        </div>
      )}

      {status === "setPrice_pending" && (
        <div className={styles.mintingPending}>
          The sale price is being updated, please be patient!
          Pending transaction is : {etherscanTxLink(tx.hash)}
        </div>
      )}

      {status === "buy_pending" && (
        <div className={styles.mintingPending}>
          Your purchase underway, please be patient!
          Pending transaction is : {etherscanTxLink(tx.hash)}
        </div>
      )}

      {tx && txReceipt && (
        <div className={styles.mintingSucceeded}>
          <span>{"Succeeded! Transaction "}{etherscanTxLink(tx.hash)}</span>
          <span>{" was mined in the Ethereum blockchain, block #"}{etherscanBlockLink(txReceipt.blockNumber)}</span>
        </div>
      )}

      {status === "mintable" && (
        <div className={styles.waiting}>
          Confirming NFT availability …
        </div>
      )}

      {status === "mintable_confirmed" && (
        <>
          <div>
            <div>This NFT is available for minting</div>
            <img  className={styles.ethereumLogo} src="/ethereum.svg" />
            <span className={styles.nftPriceETH}>
              {nft.weiPrice === "0" ?
                "FREE" :
                `${ethers.utils.formatEther(nft.weiPrice)} ETH`
              }
            </span>
            <span className={styles.nftPriceGas}>{" + gas fee"}</span>
          </div>
          <div id="walletActions">{
            walletAddress ? (
              <button disabled={isConnecting} onClick={doMint}>
                Mint this NFT
              </button>)
            : window.ethereum ? (
              <button disabled={isConnecting} onClick={doConnectWallet}>
                <span>To mint this NFT, connect your Ethereum wallet</span>
              </button>)
            : (
              <div className={styles.walletInstallInstructions}>
                <div>To mint NFTs you need an Ethereum wallet.</div>
                <div>
                  On mobile use the <a href={`https://metamask.io/`}>Metamask</a> app broswer to view this website.
                  On desktop enable the <a href={`https://metamask.io/`}>Metamask</a> browser extension.
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {status === "withheld" && (
        <div>This NFT is reserved. Please contact the artist.</div>
      )}  

      {status === "burntOrRevoked" && (
        <div>Sorry, this NFT has been burnt or revoked.</div>
      )}

      <div id="alert">{alert}</div>

      <div className={styles.connection}>
        { walletAddress ?
          (<div>
            Your wallet address is{" "}{etherscanAddressLink(walletAddress)}
          </div>)
        : isConnecting ?
          <div>Connecting...</div>
        : status === "minted" && window.ethereum &&
          <a href="" onClick={doConnectWallet}>Connect your Ethereum wallet</a>
        }
       </div>
    </div>
  );
};

export default Minter;
