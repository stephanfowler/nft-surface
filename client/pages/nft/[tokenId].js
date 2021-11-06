import Head from 'next/head'
import Layout, { siteTitle } from '@components/Layout'
import Nft from '@components/Nft'
import { fetchCatalog } from "@utils/fetch-catalog.js";

export async function getStaticPaths() {
  const catalog = await fetchCatalog();
  const paths = catalog.NFTs.map((nft) => ({
    params: {
      tokenId: nft.tokenId.toString()
    }
  }))
  return {
    paths,
    fallback: false
  }
}

export async function getStaticProps({ params }) {
  const catalog = await fetchCatalog();
  const nft = catalog.NFTs.find(nft => {
    return nft.tokenId.toString() === params.tokenId
  })
  const chainId = catalog.context.signatureDomain.chainId;
  return {
    props: { nft, chainId }
  }
}

export default function NFT({ nft, chainId }) {
  // TODO: improve og:image. Maybe we need a web optimised image specified in the catalog.
  return (
    <Layout nft={nft} chainId={chainId}>
      <Head>
        <title key="title">{process.env.creatorName}{" | "}{nft.metadata.name}</title>
        <meta property="og:image" content={process.env.catalogBaseURL + "/" + nft.webOptimizedImage} key="ogimage"/>
      </Head>
      <Nft nft={nft} chainId={chainId} />
    </Layout>
  )
}