import Head from 'next/head'
import Layout from '@components/Layout'
import styles from '@components/Layout.module.css'

/* 
Is it real / what it says it is?
Do I have the authority to sell it?
*/

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

                <p><strong>Attribution</strong> : an NFT is merely a <em>statement of ownership</em> of an item, not the item itself. It is effectively just "X owns item Y". These statements are recorded within so-called "smart contracts", the creation of which is entirely permissionless (anyone can create one), meaning that NFTs are themseles entirely permissionless. From a collector's perspective it is therefore critical that the described item is attributable to the originator of the NFT. Nothing prevents anyone from making the statement "I own the Mona Lisa". The <em>tradeable value</em> of that statement however depends entirely upon the belief that its originator is indeed Leonardo da Vinci or his executors, ie. that the item is attributable to the NFT's originator.
                </p>

                <p><strong>Originator identity</strong> : the artist/maker/brand/etc of item described by the NFT (referred to here as the NFT's originator) should publish their Ethereum address in a trusted off-chain location (eg. a widely-accepted social media account, website, etc), such that a collector can be confident that they know the originator's true Ethereum address and thus their identity on the blockchain. More generally, the collector must be confident that any statement purportedly made by the originator about their Ethereum address is not, in fact, being made by an impersonator. This - and attribution (above) - are arguably the weakest links in the "provenance chain", as everthing else below is transparently recorded on the blockchain and is thus deterministic and verifiable.
                </p>

                <p><strong>Smart Contract ownership</strong> : the originator should ideally be both the <em>creator</em> (or deployer) of the smart contract and its <em>owner</em> (as declared by the contract itself). Note that whereas the creator's Ethereum address is automatically and immutably recorded in the blockchain, the owner of the contract must be explicitly implemented so as to be immutable. 
                </p>

                <p><strong>Royalty rates</strong> : any royalty applied to secondary sales via the contract itself must be an immutable rate, and should be public. Its immutability is to prevent the rate being raised after NFTs have been minted or sold, as this could impact their resale value (and in the worst case could appropriate all sale proceeds).
                </p>

                <p><strong>Data immutability</strong> : to ensure their immutability (inability to ever be changed) the NFT's metadata and image must be stored on the blockchain itself or on public content-addressable storage that identifies data by its cryptographically secure hash (eg. the IPFS network)). This ensures that the NFT's "token URI" references the NFT's immutable metadata, and that the image URI within the metadata itself references an immutable object.</p>

                <p><strong>Metadata</strong> : the NFT's metadata should be comprehensive and should include (in addition to the obligatory name, description and image properties) the token ID, contract address, and the originator's Ethereum address (which should be checked to ensure it is equal both the contract creator and contract owner). This prevents reuse of the same metadata object by another (perhaps impersonating) NFT. These values can all be viewed and cross-compared by referring to the NFT's metatdata and a blockchain-explorer view of the contract.</p>

                <p><strong>Transparency</strong> : links to everything relevant to establishing provenance should always be provided alongside an NFT. At minimum this should include a blockchain-explorer link to the token (and thus its ID), another to the contract (and thus its creator, source code, API, transactions, etc), the IPFS metadata, and the IPFS image.</p>

                <p><strong>Contract code</strong> : the smart contract's source code must have been verified on Etherscan so that it is readable and auditable by suitably qualified persons. It should itself be structured and written such as to be clear about it's intent, and be annotated according to Solidity documentation best-practices.
                </p>

                <p><strong>Contract immutability</strong> : proxy contracts should be avoided as their behaviour can be changed at will, perhaps unfavourably to the collector. A well-behaved ERC721 proxy could later become a malicious one if its underlying implementation contract is replaced with one that no longer honours expected ERC721 behaviours. Additionally, the implementation contract has it's own distinct storage which in normal circumstances is redundant but could potentially be exploited to mint a parallel set of NFTs. Implementation contracts are likely to have the same creator as the proxy and could thus be exlpoited to hold NFTs that may appear impeccable in their provenance characteristics.
                </p>

                <p><strong>Shared contracts</strong> : as generally deployed by marketplaces, contracts that group together originators under one contract should ideally be avoided as they arguably pollute a clear provenance chain starting from the originator, to the originator's contract, to a token on that contract, to an ownership history, to the current owner. Whereas the NFT's originator should forever be unambiguously identified as being such, the marketplace where they may have minted the NFT should ideally not forever be recorded as the NFT's genesis. 
                </p>

                <p><strong>Self destruction</strong> : for obvious reasons, a collector should be wary of owning tokens in a contract that has a self-destruct capability, even if that capability is well intended and is managed by a trusted operator.   
                </p>

            </div>
        </Layout>
    )
}