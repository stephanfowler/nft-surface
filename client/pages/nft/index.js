import React from "react"
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry"

import Head from 'next/head'
import Layout, { siteTitle } from '@components/Layout'
import NftThumbnail from '@components/NftThumbnail'
import { fetchCatalog } from "@utils/fetch-catalog.js";

export async function getStaticProps() {
	const catalog = await fetchCatalog();
	const NFTs = catalog.NFTs;
	const context = catalog.context;

	return {
		props: { NFTs, context }
	}
}

export default function Home(props) {

	return (
		<Layout context={props.context}>
			<Head>
				<title key="title">{process.env.creatorName} | Catalog</title>
			</Head>
			<ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 550: 2, 900: 3 }}>
				<Masonry>
					{props.NFTs.map((nft, index) =>
						<NftThumbnail nft={nft} key={nft.tokenId} index={index} />
					)}
				</Masonry>
			</ResponsiveMasonry>
		</Layout>
	)
}
