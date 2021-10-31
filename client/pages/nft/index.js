import Head from 'next/head'
import Layout, { siteTitle } from '@components/Layout'
import NftThumbnail from '@components/NftThumbnail'
import { fetchCatalog } from "@utils/fetch-catalog.js";

export async function getStaticProps() {
  const catalog = await fetchCatalog();
  return {
    props: { catalog }
  }
}

export default function Home({ catalog }) {
  return (
    <Layout>
      <Head>
        <title>{siteTitle}</title>
      </Head>
      <div className="Catalog">
        {catalog.NFTs.map((nft, index) => 
          <NftThumbnail nft={nft} key={nft.tokenId} index={index}/>
        )}
      </div>
    </Layout>
  )
}