import React from "react"
import Masonry, {ResponsiveMasonry} from "react-responsive-masonry"

import Head from 'next/head'
import Layout, { siteTitle } from '@components/Layout'
import NftThumbnail from '@components/NftThumbnail'
import { fetchCatalog } from "@utils/fetch-catalog.js";

export async function getStaticProps() {
  const catalog = await fetchCatalog();
  const NFTs = catalog.NFTs;
  const chainId = catalog.context.chainId;

  return {
    props: { NFTs, chainId }
  }
}

class Home extends React.Component {
  render() {
      return (
        <Layout chainId={this.props.chainId}>
          <Head>
            <title key="title">{process.env.creatorName} | Catalog</title>
          </Head>
          <ResponsiveMasonry columnsCountBreakPoints={{350: 1, 550: 2, 900: 3}}>
            <Masonry>
              {this.props.NFTs.map((nft, index) =>
                <NftThumbnail nft={nft} key={nft.tokenId} index={index}/>
              )}
            </Masonry>
          </ResponsiveMasonry>
        </Layout>
      )
  }
}

export default Home;


/* without masonry:
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
*/
