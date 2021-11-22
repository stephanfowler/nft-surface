import { useState, useEffect } from "react";
import { ethers } from "ethers";

import Link from 'next/link'
import { 
    isTransactionMined,
    contractCall_price,
    contractCall_setPrice,
    contractCall_buy
  } from "@utils/ethereum-interact.js";

import {
    etherscanAddressLink
} from "@utils/links.js"
  
import styles from '@components/Nft.module.css'

export default function SalesForm({ 
    nft, owner, doConnectWallet, walletAddress, userIsOwner, setOwner, contractAddress, chainId }) {

    const [price, setPrice] = useState();
    const [priceETH, setPriceETH] = useState();
    const [displayPriceETH, setDisplayPriceETH] = useState();
    const [expanded, setExpanded] = useState(false);
    const [connecting, setConnecting] = useState();
    const [forceRender, doForceRender] = useState();

    useEffect(() => {
        async function getPrice() {
            const _price = await contractCall_price(nft, contractAddress, chainId);
            setPrice(_price);
            const _priceETH = ethers.utils.formatEther(_price);
            setPriceETH(_priceETH);
            setDisplayPriceETH(_priceETH);
        }
        getPrice();

        return () => {
            setPrice();
            setPriceETH();
            setDisplayPriceETH();
            setExpanded();
            setConnecting();
        };
    }, [forceRender]);

    const cancel = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        setDisplayPriceETH(priceETH);
    }

    const submit = (evt) => {
        evt.preventDefault();
        doUpdate(displayPriceETH)
    }

    const setZero = (evt) => {
        evt.preventDefault();
        setDisplayPriceETH("0")
        doUpdate("0");
    }

    const expand = (evt) => {
        evt.preventDefault();
        setExpanded(true);
    }

    const marketplaces = () => {
        return <span className={styles.marketplaces}>
            <Link href={nft.openseaAsset}><a className={styles.nftMarket}>OpenSea</a></Link>
            {" · "}
            <Link href={nft.raribleAsset}><a className={styles.nftMarket}>Rarible</a></Link>
        </span>
    }

    const doUpdate = async (newPriceETH) => {
        newPriceETH = newPriceETH || '0';
        if (newPriceETH != priceETH) {
            const newPrice = ethers.utils.parseEther(newPriceETH);
            setConnecting(true);
            try {
                const { tx } = await contractCall_setPrice(nft, newPrice, contractAddress, chainId);
                if (tx) {
                    //setTx(tx);
                    //setStatus("setPrice_pending")
                    const txReceipt = await isTransactionMined(tx.hash, chainId)
                    if (txReceipt) {
                        setPrice(newPrice);
                        setDisplayPriceETH(newPriceETH);
                        doForceRender(newPrice);
                        //setTxReceipt(txReceipt);
                        //setStatus("minted");
                    } else {
                        //setAlert("NOT Mined, transaction: " + tx.hash)
                    }
                }
            } catch(e) {
            }
            setExpanded(false);
            setConnecting(false);
        }
    }

    const doBuy = async (e) => {
        e && e.preventDefault();
        if (!window.ethereum) {
            return;
        }
        setConnecting(true);
        if (!walletAddress) {
            await doConnectWallet();
        }
        if (walletAddress === owner) {
            return;
        }
        const { tx, error } = await contractCall_buy(nft, price, contractAddress, chainId);
        if (tx) {
            //setTx(tx);
            //setStatus("buy_pending")
            const txReceipt = await isTransactionMined(tx.hash, chainId)
            if (txReceipt) {
                //setTxReceipt(txReceipt);
                setOwner(walletAddress);
                doForceRender(1);
                //setStatus("minted");
            } else {
            //setAlert("NOT Mined, transaction: " + tx.hash)
          }
        } else {
          console.log(error);
        }
        setConnecting(false);
    };

    return (
        <div>
            {userIsOwner && (
                <div className={styles.nftOwner}>
                This NFT is owned by{" "}{etherscanAddressLink(owner, "you")}
                </div>
            )}

            {!userIsOwner && (
                <div className={styles.nftOwner}>
                This NFT is owned by {" "}{etherscanAddressLink(owner)}
                </div>
            )}

            {userIsOwner && expanded &&
                <form>
                    {"Sell this NFT for "}
                    <input disabled={connecting}
                        autoFocus
                        type="string"
                        value={displayPriceETH}
                        onChange={e => setDisplayPriceETH(e.target.value)}
                        />
                    {" ETH "}
                    <div className={styles.formActions}>
                        <button className={styles.buttony} onClick={submit} disabled={connecting || parseFloat(priceETH) === parseFloat(displayPriceETH)}>OK</button>
                        {parseFloat(priceETH) > 0 &&
                            <button className={styles.buttony} onClick={setZero} disabled={connecting}>Terminate sale</button>
                        }
                        <button className={styles.buttony} onClick={cancel} disabled={connecting}>Cancel</button>
                    </div>
                </form>
            }

            {userIsOwner && !expanded && priceETH == 0  &&
                <div>
                    <button onClick={expand}>
                      Sell this NFT
                    </button>
                    {" or trade it on "}
                    {marketplaces()}
                </div>
            }

            {userIsOwner && !expanded && priceETH > 0 &&
                <>
                    <img  className={styles.ethereumLogo} src="/ethereum.svg" />
                    <span className={styles.nftPriceETH}>
                        {priceETH}{" ETH"}
                    </span>
                    <span className={styles.nftPriceGas}>{" + gas fee"}</span>
                    <form>
                        <button className={styles.buttony} onClick={expand}>Amend price or terminate sale</button>
                    </form>
                    <div>
                        {"You can also sell on "}
                        {marketplaces()}
                    </div>
                </>
            }

            {!userIsOwner && priceETH == 0 &&
                <div>
                    {"Make an offer on "}
                    {marketplaces()}
                </div>
            }

            {!userIsOwner && priceETH > 0 &&
                <div>
                    <img  className={styles.ethereumLogo} src="/ethereum.svg" />
                    <span className={styles.nftPriceETH}>
                        {priceETH}{" ETH"}
                    </span>
                    <span className={styles.nftPriceGas}>{" + gas fee"}</span>
                    <button onClick={doBuy} disabled={connecting || !window.ethereum} >
                      Buy this NFT
                    </button>
                    <div>
                        {"or make an offer on "} 
                        {marketplaces()}
                    </div>
                </div>
            }
        </div>
    );
}
