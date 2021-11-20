import { useState } from "react";
import { ethers } from "ethers";


export default function PriceForm({ salePrice, setSalePrice, doSetPrice }) {
    const [displayPriceEth, setDisplayPriceEth] = useState(ethers.utils.formatEther(salePrice));
    const [expanded, setExpanded] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const transact = (updatedPriceEth) => {
        const newSalePrice = ethers.utils.parseEther(updatedPriceEth).toString();
        if (newSalePrice != salePrice) {
            setIsConnecting(true);
            setSalePrice(newSalePrice);
            doSetPrice(newSalePrice);    
            setIsConnecting(false);
        }
    }

    const handleSubmit = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        transact(displayPriceEth)
    }

    const setZero = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        setDisplayPriceEth("0")
        transact("0");
    }

    const toggleExpanded = (evt) => {
        evt.preventDefault();
        setExpanded(!expanded);
    }

    return (
        <>
            {expanded &&
                <form onSubmit={handleSubmit}>
                    <label>
                        Sell it for {" "}
                        <input
                            autoFocus
                            type="string"
                            value={displayPriceEth}
                            onChange={e => setDisplayPriceEth(e.target.value)}
                            />
                    </label>
                    <input type="submit" value="OK" />
                    {parseFloat(displayPriceEth) > 0 ?
                        <input type="button" value="Cancel this sale" onClick={setZero} /> :
                        <input type="button" value="Cancel" onClick={setZero} />
                    }
                </form>
            }

            {!expanded && !isConnecting && parseFloat(displayPriceEth) === 0 &&
                <div>
                    <a href="" onClick={toggleExpanded}>Sell it?</a>
                </div>
            }

            {!expanded && !isConnecting && parseFloat(displayPriceEth) > 0 &&
                <div>
                    You are selling it for {displayPriceEth} ETH 
                    [<a href="" onClick={toggleExpanded}>relist it at a different price</a>]
                </div>
            }

            {isConnecting && 
                <div>Updating ... </div>
            }
        </>
    );
}