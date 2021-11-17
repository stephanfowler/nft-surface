import Head from 'next/head'
import Layout from '@components/Layout'
import styles from '@components/Layout.module.css'
import Link from 'next/link'

export default function FirstPost() {
    return (
        <Layout>
            <Head>
                <title>NFT Provenance and Authenticity</title>
            </Head>
            <div className={styles.pageContainer}>
                <h1>NFT Provenance and Authenticity</h1>

                <p>The NFTs minted by this site's Ethereum smart contract adhere to the following best-practices for the establisment of correct NFT provenance and authenticity.
                </p>

                <ol>
                <li><strong>Originator</strong> : the artist / maker / brand / etc (referred to here as the originator) should publish their Ethereum address in a trusted off-chain location (eg. a widely-accepted social media account, website, etc), such that a collector can be confident that they know the true address. This is arguably the weakest link, as everthing else in the "provenance chain" is transparently recorded on the blockchain and is thus deterministic and verifiable. More generally, the collector must be confident that any statement purportedly made by the originator about their Ethereum address is not, in fact, being made by an impersonator.
                </li>

                <li><strong>Contract ownership</strong> : the originator should ideally be both the <em>creator</em> (or deployer) of the smart contract and its <em>owner</em> (as declared by the contract itself). Whereas the creator's Ethereum address is always immutably recorded in the blockchain, the owner of the contract must be explicitly implemented so as to be an immutable value. 
                </li>

                <li><strong>Royalty</strong> : any royalty applied to secondary sales via the contract must be an immutable rate, and should obviously be public. The immutability is to prevent the rate being raised after NFTs have been minted or sold, as this could impact their resale value (and in the very worst case could appropriate all sale proceeds).
                </li>

                <li><strong>Token immutability</strong> : to ensure their immutability (inability to ever be changed) the NFT's metadata and the NFT's image must each be stored on IPFS (or more generally, any form of public content-addressable storage that identifies a content item by its cryptographically secure hash). This ensures that the NFT's "token URI" references the NFT's immutable metadata, and that the image URI within the metadata itself references an immutable object.</li>

                <li><strong>Metadata</strong> : the NFT's metadata should be comprehensive and should include (in addition to the obligatory name, description and image properties) the token ID, contract address, and the originator's Ethereum address (which should be checked to ensure it is equal both the contract creator and contract owner). This prevents reuse of the same metadata object by another (perhaps impersonating) NFT. These values can all be viewed and cross-compared by referring to the NFT's metatdata and a blockchain-explorer view of the contract.</li>

                <li><strong>Transparency</strong> : links to everything relevant to establishing provenance should always be provided alongside an NFT. At minimum this should include a blockchain-explorer link to the token (and thus its ID), another to the contract (and thus its creator, source code, API, transactions, etc), the IPFS metadata, and the IPFS image.</li>

                <li><strong>Contract code</strong> : the smart contract's source code must have been verified on Etherscan so that it is readable and auditable by suitably qualified persons. It should itself be structured and written such as to be clear about it's intent, and be annotated according to Solidity documentation best-practices.
                </li>

                <li><strong>Contract immutability</strong> : proxy contracts should be avoided as their behaviour can be changed at will, perhaps unfavourably to the collector. A well-behaved ERC721 proxy could later become a malicious one if its underlying implementation contract is replaced with one that no longer honours expected ERC721 behaviours. Additionally, the implementation contract has it's own distinct storage which in normal circumstances is redundant but could potentially be exploited to mint a parallel set of NFTs. Implementation contracts are likely to have the same creator as the proxy and could thus be exlpoited to hold NFTs that may appear impeccable in their provenance characteristics.
                </li>

                <li><strong>Shared contracts</strong> : as generally deployed by marketplaces, contracts that group together originators under one contract should ideally be avoided as they arguably pollute a clear provenance chain starting from the originator, to the originator's contract, to a token on that contract, to an ownership history, to the current owner. Whereas the NFT's originator should forever be unambiguously identified as being such, the marketplace where they may have minted the NFT should ideally not forever be recorded as the NFT's genesis. 
                </li>

                <li><strong>Self destruction</strong> : for obvious reasons, a collector should be wary of owning tokens in a contract that has a self-destruct capability, even if that capability is well intended and is managed by a trusted operator.   
                </li>

                </ol>
            </div>
        </Layout>
    )
}