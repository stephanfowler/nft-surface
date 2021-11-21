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
        if (newPriceETH != salePriceETH) {
            const newSalePrice = ethers.utils.parseEther(newPriceETH);
            setIsConnecting(true);
            try {
                setSalePrice(newSalePrice);
                await updateContractPrice(newSalePrice);
            } catch(e) {
                setSalePrice(salePrice);
                setDisplayPriceETH(salePriceETH);
                setExpanded(false);
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
                        <input type="button" value="Terminate this sale" onClick={setZero} />
                    }
                </form>
            }

            {!expanded && !isConnecting && !displayPriceETH &&
                <div>
                    <button onClick={expand}>
                      Sell it?
                    </button>
                </div>
            }

            {!expanded && !isConnecting && parseFloat(displayPriceETH) > 0 &&
                <div>
                    You are selling it for {displayPriceETH} ETH 
                    [<a href="" onClick={expand}>relist it at a different price</a>]
                </div>
            }

            {isConnecting && 
                <div>Confirm in your wallet... </div>
            }
        </>
    );
}