import { useState, useEffect } from "react";
import { ethers } from "ethers";

import { 
    isTransactionMined,
    contractCall_price,
    contractCall_setPrice,
    contractCall_buy
  } from "@utils/ethereum-interact.js";
  
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

    const doUpdate = async (newPriceETH) => {
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
        <>
            {userIsOwner && expanded &&
                <form onSubmit={submit}>
                    <label>
                        Sell it for {" "}
                        <input
                            autoFocus
                            type="string"
                            value={displayPriceETH}
                            onChange={e => setDisplayPriceETH(e.target.value)}
                            />
                    </label>
                    <input type="submit" value="OK" disabled={priceETH === displayPriceETH} />
                    <input type="button" value="Cancel" onClick={cancel} />
                    {parseFloat(priceETH) > 0 &&
                        <input type="button" value="Terminate this sale" onClick={setZero} />
                    }
                </form>
            }

            {userIsOwner && !expanded && !connecting && priceETH == 0  &&
                <div>
                    <button onClick={expand}>
                      Sell it?
                    </button>
                </div>
            }

            {userIsOwner && !expanded && !connecting && priceETH > 0 &&
                <div>
                    You are selling it for {priceETH} ETH 
                    [<a href="" onClick={expand}>relist it at a different price</a>]
                </div>
            }

            {!userIsOwner && priceETH > 0 &&
                <div>
                    <button onClick={doBuy}>
                      Buy it for {priceETH}
                    </button>
                </div>
            }

            {connecting && 
                <div>Confirm in your wallet... </div>
            }


        </>
    );
}