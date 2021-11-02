import { ethers } from "ethers";

import { useEffect, useState } from "react";
import { isTransactionMined, connectWallet, ownerOf, claimable, claim } from "@utils/ethereum-interact.js";

import Link from 'next/link'
import ShortAddress from '@components/ShortAddress'

import styles from '../Nft.module.css'

const Minter = ({ nft, context, status, setStatus }) => {
  const tokenId = nft.tokenId;

  const [owner, setOwner] = useState("");
  const [walletAddress, setWallet] = useState("");
  const [alert, setAlert] = useState("");
  const [tx, setTx] = useState();
  const [txReceipt, setTxReceipt] = useState();

  const userIsOwner = (owner && walletAddress && (owner.toUpperCase() === walletAddress.toUpperCase()));

  const contractAddress = context.signatureDomain.verifyingContract;
  const chainId = context.signatureDomain.chainId;

  useEffect(() => {
    async function getTokenStatus() {
      const catalogStatus = nft && nft.status;
      if (!nft) {
        setStatus(undefined)
      } else if (catalogStatus === "burnt" || catalogStatus === "withheld" ) {
        setStatus(catalogStatus);
      } else {
        const owner = await ownerOf(tokenId, contractAddress, chainId);
        if (owner) {
          setOwner(owner);
          setStatus("minted")
        } else {
          await claimable(nft, contractAddress, chainId) ? 
            setStatus("claimable") : 
            setStatus("revoked");
        }
      }
    }
    getTokenStatus();

    async function fetchWallet() {
      const walletRespone = await connectWallet(false);
      if (walletRespone && walletRespone.address) setWallet(walletRespone.address);
      if (walletRespone && walletRespone.error)   setAlert(walletRespone.error);  
    }
    fetchWallet();
  
    async function addWalletListener() {
      if (window.ethereum) {
        window.ethereum.on("accountsChanged", (accounts) => {
          setWallet(accounts.length ? accounts[0] : "");
          getTokenStatus();
        });
      }
    }
    addWalletListener();  
  }, [nft, tokenId]);

  const onConnectWalletClicked = async () => {
    const walletRespone = await connectWallet(true);
    setWallet(walletRespone.address);
    setAlert(walletRespone.error);
  };

  const onClaimClicked = async () => {
    const { tx, error } = await claim(nft, contractAddress, chainId);
    if (tx) {
      setTx(tx);
      setStatus("_minting")
      //setAlert("Pending transaction: " + tx.hash)
      const txReceipt = await isTransactionMined(tx.hash)
      if (txReceipt) {
        setTxReceipt(txReceipt);
        setOwner(walletAddress);
        setStatus("minted");
      } else {
        setAlert("NOT Mined, transaction: " + tx.hash)
      }
    } else {
      setAlert("idMintingFailed")
      console.log(error);
    }
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
    nft ?
    <div className={styles.minter}>

      <div className={styles.nftStatus}>
        {status === "minted" && (
          <>
            <div className={styles.nftOwner}>This NFT is owned by {" "}
              {etherscanAddressLink(owner, userIsOwner ? "you" : undefined)}
            </div>
            {tx && txReceipt && ( 
              <div className={styles.mintingSuccess}>
                <span>{"Minting succeeded with transaction "}{etherscanTxLink(tx.hash)}</span>
                <span>{" mined in Ethereum block #"}{etherscanBlockLink(txReceipt.blockNumber)}</span>
              </div>
            )}
          </>
        )}
        {status === "burnt" && (
          <div>Sorry, this NFT has been burnt</div>
        )}
        {status === "withheld" && (
          <div>This NFT is reserved. Please contact the artist.</div>
        )}  
        {status === "claimable" && (
          <>
            <div>Available for minting</div>
            <div className={styles.nftPrice}>
              {"Price Ξ "}
              <span className={styles.nftPriceETH}>{ethers.utils.formatEther(nft.weiPrice)}</span>
              {" ETH + gas"}
            </div>
          </>
        )}
        {status === "revoked" && (
          <div>Sorry, this NFT is no longer avaliable.</div>
        )}
        {status === "_minting" && (
          <>
            <div className={styles.minting}>This NFT is being minted for you. Please be patient!</div>
            <div className={styles.minting}>Pending transaction: {etherscanTxLink(tx.hash)}</div>
          </>
        )}  
        {status === "_querying" && (
          <div className="waiting">Querying the blockchain...</div>
        )}  
      </div>
      
      {status === "claimable" && (
        <div id="walletActions">{
          walletAddress ? (
            <button onClick={onClaimClicked}>
              Mint this NFT
            </button>) :
          window.ethereum ? (
            <button onClick={onConnectWalletClicked}>
              <span>To mint this NFT, first connect your wallet</span>
            </button>)
          : (
            <div>
              To mint this NFT you need an Ethereum wallet browser extension, for example <a href={`https://metamask.io/`}>Metamask</a>
            </div>
          )}
        </div>
      )}

      {<div id="alert">{alert}</div>}

      {walletAddress && (
        <div className={styles.connectedAddress}>
          Your wallet address is {" "} 
          {etherscanAddressLink(walletAddress)}
        </div>
      )}

    </div>
    :
    <div>No NFT is listed with tokenID {tokenId}</div>
  );
};

export default Minter;
