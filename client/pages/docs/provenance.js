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

                <p>The must publish their Ethereum address somewhere trusted - off-chain - in a such a way that the collector is confident that they know the artist's legitimate Ethereum address. This is arguably the weakest link; the collector must be confident that any statement purportedly made by the artist about their ETH address is not in fact being made by an impersonator.
                </p>

                <p>The artist should be both (1) the <strong>creator</strong> of the smart contract, and (2) the <strong>owner</strong> of the smart contract. Whereas the contract creator's ETH address is always immutably recorded in the blockchain, the "owner" of the cotract must explicitly be implemented so as to immutable. 
                </p>

                <p>To ensure immutability, the NFT's metadata and images MUST be stored on IPFS. This implies that the tokenURI of the NFT must be an IPFS URI.</p>

                <p>The NFT's metadata should be comprehensive and should include the tokenID, contract address, and artist's Ethereum address (which should equal the contract creator and contract owner, as described above). These values can all be checked by referring to Etherscan.</p>

                <p>The smart contract's code MUST have been verified by Etherscan, so that it is readable by suitably qualified persons. It should be written such as to be clear on it's intent and be documented appropriately.
                </p>

                <p>"Proxy" contracts are to be avoided. Their underlying logic can be changed unfavourably; a well-behaved ERC721 can become a malicious ERC721 contract by changing their underlying "implementation contract". The latter could also be directly interacted with; it has it's own distinct storage which in normal circumstances is unused but could potentially be exploited to mint a parallel set of illegitimate NFTs. It has the same creator as the proxy and could itself impeccable in it's provenance characteristics.
                </p>

                <p>Group contracts (as generally deploted by marketplaces) shoud ideally be avoided, as they pollute the provenance chain from artist, to NFT, to current owner.
                </p>

            </div>
        </Layout>
    )
}