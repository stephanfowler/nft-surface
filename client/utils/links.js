import Link from 'next/link'
import ShortAddress from '@components/ShortAddress'

export function etherscanAddressLink(address, linktext) {
    return (
        <Link href={(process.env.etherscanAddress || "").replace("<address>", address)}>
            <a target="_blank">{linktext || <ShortAddress address={address} />}</a>
        </Link>)
}

export function etherscanTxLink(hash) {
    return (
        <Link href={(process.env.etherscanTx || "").replace("<hash>", hash)}>
            <a target="_blank"><ShortAddress address={hash} /></a>
        </Link>)
}

export function etherscanBlockLink(number) {
    return (
        <Link href={(process.env.etherscanBlock || "").replace("<number>", number)}>
            <a target="_blank">{number}</a>
        </Link>)
}
