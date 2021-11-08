import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { networkName, isTransactionMined, getWallet, connectWallet, ownerOf, claimable, claim } from "@utils/ethereum-interact.js";

import Link from 'next/link'
import Image from 'next/image'
import ShortAddress from '@components/ShortAddress'

import styles from '@components/Nft.module.css'

const Minter = ({ nft, chainId, status, setStatus }) => {
  const tokenId = nft.tokenId;

  const [owner, setOwner] = useState();
  const [walletAddress, setWallet] = useState();
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
      if (status === "minted") {
        const owner = await ownerOf(tokenId, contractAddress, chainId);
        if (owner) {
          setOwner(owner)
        } else {
          setStatus("revoked")
        }
      } 
      if (status === "claimable") {
        const owner = await ownerOf(tokenId, contractAddress, chainId);
        if (owner) {
          setOwner(owner);
          setStatus("minted")
        } else {
          await claimable(nft, contractAddress, chainId) ?
            setStatus("claimable_confirmed") :
            setStatus("revoked") 
        }
      }
    }
    updateTokenStatus();

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
    addWalletListener();

    return () => {
      setStatus();
      setOwner();
      setWallet();
      setAlert();
    }
  }, [nft, tokenId]);

  const onConnectWalletClicked = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setAlert();
    const wallet = await connectWallet();
    setWallet(wallet.address);
    setChainIdMismatch(wallet.chainId && wallet.chainId !== chainId);
    setAlert(wallet.error );
    setIsConnecting(false);
  };

  const onClaimClicked = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setAlert();
    const { tx, error } = await claim(nft, contractAddress, chainId);
    if (tx) {
      setTx(tx);
      setStatus("mint_pending")
      const txReceipt = await isTransactionMined(tx.hash)
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
        <a>{linktext || <ShortAddress address={address} />}</a>
      </Link>)
  }

  function etherscanTxLink(hash) {
    return (
      <Link href={(process.env.etherscanTx || "").replace("<hash>", hash)}>
        <a><ShortAddress address={hash} /></a>
      </Link>)
  }

  function etherscanBlockLink(number) {
    return (
      <Link href={(process.env.etherscanBlock || "").replace("<number>", number)}>
        <a>{number}</a>
      </Link>)
  }

  return (
    !nft ?
      <div>No NFT is listed with tokenID {tokenId}</div>
    : 
    chainIdMismatch ?
        <div className={styles.walletInstallInstructions}>
          {"Please switch your wallet to "}{networkName(chainId)}
        </div>
    :
    <div className={styles.minter}>
      <div className={styles.nftStatus}>

        {status === "minted" && owner && (
          <div className={styles.nftOwner}>This NFT is owned by {" "}
            {etherscanAddressLink(owner, userIsOwner ? "you" : undefined)}
          </div>
        )}

        {status === "mint_pending" && (
          <>
            <div className={styles.mintingPending}>
              This NFT is being minted for you, please be patient!
              Pending transaction is : {etherscanTxLink(tx.hash)}
            </div>
          </>
        )}

        {tx && txReceipt && (
          <div className={styles.mintingSucceeded}>
            <span>{"Minting succeeded, with transaction "}{etherscanTxLink(tx.hash)}</span>
            <span>{" mined in Ethereum block #"}{etherscanBlockLink(txReceipt.blockNumber)}</span>
          </div>
        )}

        {status === "claimable" && (
          <div className={styles.waiting}>
            Checking the status of this NFT…
          </div>
        )}

        {status === "claimable_confirmed" && (
          <div>
            <div>This NFT is available for minting</div>
            <img  className={styles.ethereumLogo} src="/ethereum.svg" />
            <span className={styles.nftPriceETH}>{ethers.utils.formatEther(nft.weiPrice)}{" ETH"}</span>
            <span className={styles.nftPriceGas}>{" + gas fee"}</span>
          </div>
        )}

        {status === "withheld" && (
          <div>This NFT is reserved. Please contact the artist.</div>
        )}  

        {status === "burnt" && (
          <div>Sorry, this NFT has been burnt</div>
        )}

        {status === "revoked" && (
          <div>Sorry, this NFT is no longer avaliable.</div>
        )}
      </div>

      {status === "claimable_confirmed" && (
        <div id="walletActions">{
          walletAddress ? (
            <button disabled={isConnecting} onClick={onClaimClicked}>
              Mint this NFT
            </button>)
          :
          window.ethereum ? (
            <button disabled={isConnecting} onClick={onConnectWalletClicked}>
              <span>To mint this NFT, connect your Ethereum wallet</span>
            </button>)
          : (
            <div className={styles.walletInstallInstructions}>
              <div>
                To mint this NFT you'll need an Ethereum wallet.
              </div>
              <div>
                On mobile use the <a href={`https://metamask.io/`}>Metamask</a> app's broswer to view this website.
              </div>
              <div>
                On desktop enable the <a href={`https://metamask.io/`}>Metamask</a> browser extension.
              </div>
            </div>
          )}
        </div>
      )}

      {<div id="alert">{alert}</div>}

      <div className={styles.connection}>
        { walletAddress ?
          (<div>
            Your wallet address is{" "}{etherscanAddressLink(walletAddress)}
          </div>)
        : isConnecting ?
          <div>Connecting...</div>
        : status === "minted" && window.ethereum &&
          <a href="" onClick={onConnectWalletClicked}>Connect your Ethereum wallet</a>
        }
       </div>
    </div>
  );
};

export default Minter;
