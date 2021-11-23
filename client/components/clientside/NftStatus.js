import { ethers } from "ethers";
import { useEffect, useState } from "react";

import { 
  networkName,
  isTransactionMined,
  getWallet,
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

const NftStatus = ({ nft, chainId, status, setStatus }) => {
  const [walletAddress, setWallet] = useState();
  const [statusUpdated, setStatusUpdated] = useState();
  const [owner, setOwner] = useState();
  const [tx, setTx] = useState();
  const [isConnecting, setIsConnecting] = useState();
  const [chainIdMismatch, setChainIdMismatch] = useState();
  const [notify, setNotify] = useState();

  const contractAddress = nft.metadata.contractAddress;

  useEffect(() => {
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
    }
  }, []);

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

  const doConnectWallet = async (e) => {
    e && e.preventDefault();
    await fetchWallet(true)
  };

  const doMint = async (e) => {
    if (!window.ethereum) return;
    setNotify("confirmation_required");
    setIsConnecting(true);
    if (!walletAddress) await doConnectWallet();
    try {  
      const { tx, error } = await contractCall_mint(nft, contractAddress, chainId);
      if (tx) {
        setTx(tx);
        setNotify("tx_pending");
        const txReceipt = await isTransactionMined(tx.hash, chainId)
        if (txReceipt) {
          setNotify("tx_succeded");
          setOwner(walletAddress);
          setStatus("minted");
        } else {
          setNotify("tx_failed");
        }
      } else {
        setNotify(error.includes("insufficient funds") ? "insufficient_funds" : error);
      }
    } catch(error) {
      setNotify(error.message);
    }
    setIsConnecting(false);
  };

  return (
    chainIdMismatch ?
      <div className={styles.notification}>
        {"To establish the status of this NFT, please switch your wallet to network: "}{networkName(chainId)}
      </div>

    : !statusUpdated ?
      <div className={styles.minter}>
        Checking NFT status …
      </div>

    :
    <div className={styles.minter_updated}>
      {owner && (
        <SalesForm
          nft={nft}
          owner={owner}
          doConnectWallet={doConnectWallet}
          walletAddress={walletAddress}
          setOwner={setOwner}
          setNotify={setNotify}
          setTx={setTx}          
          contractAddress={contractAddress}
          chainId={chainId} />
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

      <div className={styles.notification}>
        { notify === "insufficient_funds" ?
          <div>You have insufficient funds in your wallet</div>

        : notify === "tx_pending" ?
        <div>{"Please be patient while transaction "}{etherscanTxLink(tx.hash)}{" is added to the blockchain..."}</div>
        
        : notify === "tx_succeded" ?
        <div>{"Done! Transaction "}{etherscanTxLink(tx.hash)}{" was succesful"}</div>
          
        : notify === "tx_failed" ?
        <div>{"Sorry, transaction "}{etherscanTxLink(tx.hash)}{" failed"}</div>
          
        : notify === "confirmation_required" ?
        <div>{"Please confirm using your wallet..."}</div>
          
        : notify === "wallet_unavailable" ?
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
          
        : notify ?
        <div>{notify}</div>
          
        : walletAddress ?
          <div>Your wallet address is{" "}{etherscanAddressLink(walletAddress)}</div>

        : window.ethereum ?
          <div>
            {"Connect your "} 
            <a href="" onClick={doConnectWallet}>Ethereum wallet</a>
          </div>

        : <></>
        }
       </div>
    </div>
  );
};

export default NftStatus;