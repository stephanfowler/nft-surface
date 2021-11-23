import Link from 'next/link'

export function shortAddress(address, chars) {  
    const l = chars || 4;
    const a = (address || "").toLowerCase();
    return a.substr(0, l+2) + "…" + a.substr(a.length - l);
}

export function etherscanAddressLink(address, linktext) {
    return (
        <Link href={(process.env.etherscanAddress || "").replace("<address>", address)}>
            <a target="_blank">{linktext || shortAddress(address)}</a>
        </Link>)
}

export function etherscanTxLink(hash) {
    return (
        <Link href={(process.env.etherscanTx || "").replace("<hash>", hash)}>
            <a target="_blank">{shortAddress(hash)}</a>
        </Link>)
}

export function etherscanBlockLink(number) {
    return (
        <Link href={(process.env.etherscanBlock || "").replace("<number>", number)}>
            <a target="_blank">{number}</a>
        </Link>)
}

