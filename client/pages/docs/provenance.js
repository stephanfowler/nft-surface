import Head from 'next/head'
import Layout from '@components/Layout'
import styles from '@components/Layout.module.css'
import Link from 'next/link'

export default function FirstPost() {
    return (
        <Layout>
            <Head>
                <title>Ensuring correct NFT provenance</title>
            </Head>
            <div className={styles.pageContainer}>
                <h1>Ensuring correct NFT provenance</h1>

                <p>The must publish their Ethereum address somewhere trusted, off-chain, such that the collector is confident that they know the artist's true address. This is arguably the weakest link, as everything else is transparently recorded on the blockchain and thus verifyable. The collector must therefore be confident that any statement purportedly made by the artist about their ETH address is not, in fact, being made by an impersonator.
                </p>

                <p>The artist should be both (1) the <strong>creator</strong> of the smart contract and (2) the <strong>owner</strong> of the smart contract. Whereas the creator's ETH address is always immutably recorded in the blockchain, the "owner" of the contract must explicitly be implemented to be immutable. 
                </p>

                <p>To ensure their immutability, the NFT's metadata and images MUST be stored on IPFS. This means that the "tokenURI" of the NFT must be an IPFS URI referencing the NFT's metadata, and the image URI within that metadata must itself be a IPFS URI.</p>

                <p>The NFT's metadata should be comprehensive and should include the token ID, contract address, and artist's Ethereum address (which must equal both the contract creator and contract owner, as described above). These values can all be checked and compared by referring to Etherscan.</p>

                <p>The smart contract's code MUST have been verified by Etherscan so that it is readable by suitably qualified persons. It should itself be written such as to be clear about it's intent and be documented appropriately.
                </p>

                <p>"Proxy" contracts are to be avoided. Their underlying logic can be changed unfavourably; a well-behaved ERC721 could later become a malicious one, by changing its underlying "implementation contract". The implementation contract could also be directly interacted with by an malicious party; it has it's own distinct storage which in normal circumstances is unused but could potentially be exploited to mint a parallel set of illegitimate NFTs. It has the same creator as the proxy, and could apprear impeccable in it's provenance characteristics if confused for its proxy.
                </p>

                <p>Group contracts (as generally deploted by marketplaces) shoud ideally be avoided, as they pollute a clear provenance chain from artist, to artist's contract, to token, to subsequent ownership. Whereas the artist forever remains the creator of their art, the marketplace where they may have minted it should ideally not forever be recorded as the NFT's provenance. 
                </p>

            </div>
        </Layout>
    )
}