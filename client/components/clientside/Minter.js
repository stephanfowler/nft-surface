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

import {
  etherscanAddressLink,
  etherscanTxLink,
  etherscanBlockLink
} from "@utils/links.js"

import SalesForm from '@components/clientside/SalesForm'

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
      } else {
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
    e && e.preventDefault();
    const wallet = await connectWallet();
    setWallet(wallet.address);
    setChainIdMismatch(wallet.chainId && wallet.chainId !== chainId);
    setAlert(wallet.error );
  };

  const doMint = async (e) => {
    e && e.preventDefault();
    if (!window.ethereum) {
      return;
    }
    setIsConnecting(true);
    if (!walletAddress) {
      await doConnectWallet();
    }
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

      {owner && (
        <SalesForm nft={nft} owner={owner} doConnectWallet={doConnectWallet} walletAddress={walletAddress} userIsOwner={userIsOwner} setOwner={setOwner} contractAddress={contractAddress} chainId={chainId} />
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
          <div id="walletActions">
              <button onClick={doMint} disabled={isConnecting || !window.ethereum}>
                Mint this NFT
              </button>
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

      <div className={styles.walletInstallInstructions}>
        { walletAddress ?
          <div>Your wallet address is{" "}{etherscanAddressLink(walletAddress)}</div>

          : window.ethereum ?
          <div>
            {"Connect your "} 
            <a href="" onClick={doConnectWallet}>Ethereum wallet</a>
          </div>

          :
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
          </div>
        }
       </div>
    </div>
  );
};

export default Minter;

/*
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
*/
