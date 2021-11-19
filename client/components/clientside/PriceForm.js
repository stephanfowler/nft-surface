import { useState } from "react";
import { ethers } from "ethers";

function floatyString(n) {
    return isNaN(parseFloat(n)) ? "0" : parseFloat(n).toString()
}

function bigNumberify(n) {
    return ethers.utils.parseEther(floatyString(n));
}

export default function PriceForm({ ethPrice }) {
    const [price, setPrice] = useState(ethPrice);
    const [expanded, setExpanded] = useState(false);
  
    const handleSubmit = (evt) => {
        evt.preventDefault();
        setExpanded(false);

        console.log(floatyString(price));
        console.log(bigNumberify(price));
    }

    const setZero = (evt) => {
        evt.preventDefault();
        setExpanded(false);
        setPrice("")

        console.log(floatyString(price));
        console.log(bigNumberify(price));
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
                            type="number"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            />
                    </label>
                    <input type="submit" value="OK" />
                </form>
            }

            {!expanded && price == 0 &&
                <div>
                    <a href="" onClick={toggleExpanded}>Sell it?</a>
                </div>
            }

            {!expanded && price > 0 &&
                <div>
                    <div>You are selling it for {price} ETH</div>
                    <div>[<a href="" onClick={toggleExpanded}>edit</a>]</div>
                    <div>[<a href="" onClick={setZero}>cancel sale</a>]</div>
                    
                </div>
            }

        </>
    );
}