import Head from 'next/head'
import Layout from '@components/Layout'
import Image from 'next/image'
import Link from 'next/link'
import { explorerAddressLink } from "@utils/links.js";
import styles from '@components/Layout.module.css'

import frontImage from '@public/frontpage-bg.jpg'

import { fetchCatalog } from "@utils/fetch-catalog.js";

export async function getStaticProps() {
	const catalog = await fetchCatalog();
	const context = catalog.context;

	return {
		props: { context }
	}
}

export default function Home(props) {
	const contractAddress = props.context.contractAddress;
	const creatorAddress = props.context.creatorAddress;
	const chainId = props.context.chainId;

	return (
		<Layout context={props.context} home>
			<Head>
				{/* homepage meta */}
			</Head>

			<Image
				className={styles.landingHeroImage}
				src={frontImage}
				placeholder="blur"
				alt="front image"
				priority
				layout="fill"
				objectFit="cover"
				objectPosition="center" />

			<div className={styles.landingHeroTextA}>{process.env.creatorName}</div>
			<Link href="/nft">
				<a className={styles.landingHeroTextB}>
					NFT<br />CATALOG
				</a>
			</Link>
			<div className={styles.landingAddress}>
				<div>{process.env.creatorName} address : {explorerAddressLink(chainId, creatorAddress)}</div>
				<div>Smart Contract : {explorerAddressLink(chainId, contractAddress)}</div>
			</div>
		</Layout>
	)
}
