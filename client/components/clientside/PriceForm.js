import { useState, useEffect } from "react";
import { ethers } from "ethers";


export default function PriceForm({ salePrice, setSalePrice, updateContractPrice }) {
    const salePriceETH = salePrice === "0" ? "" : ethers.utils.formatEther(salePrice);

    const [displayPriceETH, setDisplayPriceETH] = useState(salePriceETH);
    const [expanded, setExpanded] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        return () => {
            setDisplayPriceETH();
            setExpanded();
            setIsConnecting();
        };
    }, []);

    const cancel = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        setDisplayPriceETH(salePriceETH);
    }

    const submit = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        transact(displayPriceETH)
    }

    const setZero = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        setDisplayPriceETH("0")
        transact("0");
    }

    const toggleExpanded = (evt) => {
        evt.preventDefault();
        setExpanded(!expanded);
    }

    const transact = async (newPriceETH) => {
        if (newPriceETH != salePriceETH) {
            const newSalePrice = ethers.utils.parseEther(newPriceETH);
            setSalePrice(newSalePrice);
            setIsConnecting(true);
            try {
                await updateContractPrice(newSalePrice);
            } catch(e) {
                cancel();
            }
            setIsConnecting(false);
        }
    }

    return (
        <>
            {expanded &&
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
                    <input type="submit" value="OK" disabled={salePriceETH === displayPriceETH} />
                    <input type="button" value="Cancel" onClick={cancel} />
                    {parseFloat(salePriceETH) > 0 &&
                        <input type="button" value="Terminate the sale" onClick={setZero} />
                    }
                </form>
            }

            {!expanded && !isConnecting && !displayPriceETH &&
                <div>
                    <a href="" onClick={toggleExpanded}>Sell it?</a>
                </div>
            }

            {!expanded && !isConnecting && parseFloat(displayPriceETH) > 0 &&
                <div>
                    You are selling it for {displayPriceETH} ETH 
                    [<a href="" onClick={toggleExpanded}>relist it at a different price</a>]
                </div>
            }

            {isConnecting && 
                <div>Confirm in your wallet... </div>
            }
        </>
    );
}