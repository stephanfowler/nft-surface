import { useState } from "react";
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { shortAddress, getAssetHref } from "@utils/links.js";

const NftStatus = dynamic(
	() => import('../components/clientside/NftStatus'),
	{ ssr: false }
)

import styles from '@components/Nft.module.css'

function getIpfsHref(template, ipfsURI) {
	const ipfsHash = (ipfsURI || "").replace("ipfs://", "");
	return (template || "").replace("<ipfsHash>", ipfsHash);
}

export default function Nft({ nft, context }) {
	const contractAddress = context.contractAddress;
	const creatorAddress = context.creatorAddress;
	const tokenId = nft.tokenId;

	nft.openseaAsset = getAssetHref(process.env.openseaAsset, contractAddress, tokenId);
	nft.raribleAsset = getAssetHref(process.env.raribleAsset, contractAddress, tokenId);
	nft.etherscanToken = getAssetHref(process.env.etherscanToken, contractAddress, tokenId);
	nft.etherscanContract = getAssetHref(process.env.etherscanAddress, contractAddress, tokenId);
	nft.etherscanCreator = getAssetHref(process.env.etherscanAddress, creatorAddress, tokenId);
	nft.ipfsMetadata = getIpfsHref(process.env.ipfsGateway, nft.tokenURI);
	nft.ipfsImage = getIpfsHref(process.env.ipfsGateway, nft.metadata.image);

	const width = nft.metadata.width || 100;
	const height = nft.metadata.height || 100;
	const orient = width > height ? 'landscape' : 'portrait';

	return (
		<div className={styles.nft}>

			<div className={`${styles.nftImage} ${orient}`}>
				<Image
					src={process.env.catalogBase + "/" + nft.webOptimizedImage}
					width={width}
					height={height}
					placeholder={nft.placeholderImage ? "blur" : "empty"}
					blurDataURL={nft.placeholderImage}
					alt={nft.metadata.name}
					priority
					layout="responsive" />
			</div>

			<div className={styles.nftStory}>

				<div className={styles.nftMetadata}>
					<h1 className={styles.nftName}>{nft.metadata.name}</h1>
					<div className={styles.nftCreatorAndDate}>{nft.metadata.creator} {nft.metadata.date}</div>
					<div className={styles.nftEdition}>Edition {nft.metadata.edition || "1 / 1"}</div>
					<div className={styles.nftDimensions}>{width}{" x "}{height}{" px"}</div>
					{nft.metadata.collection &&
						<div className={styles.nftEdition}>Collection : {nft.metadata.collection || "1 / 1"}</div>
					}
					<div className={styles.nftDescription}>{
						(nft.metadata.description + "").split("/n").map((para, index) =>
							<div key={index}>{para}</div>
						)
					}</div>
				</div>

				<div className={styles.nftActions}>
					<NftStatus nft={nft} context={context} />
				</div>

				<div className={styles.nftDetails}>
					<div className={styles.nftDetailsHeader}>NFT details</div>
					<div>Blockchain : Ethereum</div>
					<div>Token standard : ERC721</div>
					<div>
						{"Secondary sale royalty : "}
						{context.royaltyBasisPoints / 100}
						{"%"}
					</div>
					<div>
						{"Token ID : "}
						<Link href={nft.etherscanToken}>
							<a title="view token on etherscan">
								{tokenId}
							</a>
						</Link>
					</div>
					<div>
						{"Contract : "}
						<Link href={nft.etherscanContract}>
							<a title="view contract on etherscan">
								{shortAddress(contractAddress)}
							</a>
						</Link>
					</div>
					<div>
						{"Creator : "}
						<Link href={nft.etherscanCreator}>
							<a title="view creator on etherscan">
								{shortAddress(creatorAddress)}
							</a>
						</Link>
					</div>
					<div>
						{"IPFS immutable "}
						<Link href={nft.ipfsImage}>
							<a title="view image on IPFS">image</a>
						</Link>
						{" | "}
						<Link href={nft.ipfsMetadata}>
							<a title="view image on IPFS">metadata</a>
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}