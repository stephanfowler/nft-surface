import { useState, useEffect } from "react";
import { ethers } from "ethers";

import Link from 'next/link'
import { 
    isTransactionMined,
    contractCall_price,
    contractCall_setPrice,
    contractCall_buy
  } from "@utils/ethereum-interact.js";

import styles from '@components/Nft.module.css'

export default function SalesForm({ nft, walletAddress, userIsOwner, setOwner, contractAddress, chainId }) {

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

    const doBuy = async (e) => {
        e.preventDefault();
        setConnecting(true);
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

    const cancel = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        setDisplayPriceETH(priceETH);
    }

    const submit = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        doUpdate(displayPriceETH)
    }

    const setZero = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        setDisplayPriceETH("0")
        doUpdate("0");
    }

    const expand = (evt) => {
        evt.preventDefault();
        setExpanded(true);
    }

    const marketplaces = () => {
        return <>
            <Link href={nft.openseaAsset}><a className={styles.nftMarket}>OpenSea</a></Link>
            {" | "}
            <Link href={nft.raribleAsset}><a className={styles.nftMarket}>Rarible</a></Link>
        </>
    }

    const doUpdate = async (newPriceETH) => {
        newPriceETH = newPriceETH || '0';
        if (newPriceETH != priceETH) {
            const newPrice = ethers.utils.parseEther(newPriceETH);
            setConnecting(true);
            try {
                const tx = await contractCall_setPrice(nft, newPrice, contractAddress, chainId);
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
            setConnecting(false);
        }
    }

    return (
        <div className={styles.nftTrade}>
            {userIsOwner && expanded &&
                <form>
                    {"Sell this NFT for "}
                    <input
                        autoFocus
                        type="string"
                        value={displayPriceETH}
                        onChange={e => setDisplayPriceETH(e.target.value)}
                        />
                    {" ETH "}
                    <div className={styles.formActions}>
                        <button className={styles.buttony} onClick={submit} disabled={parseFloat(priceETH) === parseFloat(displayPriceETH)}>OK</button>
                        {parseFloat(priceETH) > 0 &&
                            <button className={styles.buttony} onClick={setZero}>Terminate sale</button>
                        }
                        <button className={styles.buttony} onClick={cancel}>Cancel</button>
                    </div>
                </form>
            }

            {userIsOwner && !expanded && !connecting && priceETH == 0  &&
                <div>
                    <button onClick={expand}>
                      Sell this NFT
                    </button>
                    {" or trade it on "}
                    {marketplaces()}
                </div>
            }

            {userIsOwner && !expanded && !connecting && priceETH > 0 &&
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
                    {"Trade it on "}
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
                    <button onClick={doBuy} disabled={connecting} >
                      Buy this NFT
                    </button>
                    <div>
                        {"or make an offer on "} 
                        {marketplaces()}
                    </div>
                </div>
            }



            {connecting && 
                <div>Confirm in your wallet... </div>
            }


        </div>
    );
}

/*
        <div className={styles.nftTrade}>
          <SalesForm nft={nft} walletAddress={walletAddress} userIsOwner={userIsOwner} setOwner={setOwner} contractAddress={contractAddress} chainId={chainId} />
        </div>

*/