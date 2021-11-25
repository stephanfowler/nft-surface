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
  const context = catalog.context;
  return {
    props: { nft, context }
  }
}

export default function NFT({ nft, context }) {
  return (
    <Layout nft={nft} context={context}>
      <Head>
        <title key="title">{process.env.creatorName}{" | "}{nft.metadata.name}</title>
        <meta property="og:image" content={process.env.catalogBaseURL + "/" + nft.webOptimizedImage} key="ogimage"/>
      </Head>
      <Nft nft={nft} context={context} />
    </Layout>
  )
}