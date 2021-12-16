import dynamic from 'next/dynamic'
import Image from 'next/image'
import { explorerAddressLink, explorerTokenLink, ipfsLink } from "@utils/links.js";

import { chainSpec } from "@utils/ethereum-interact.js";

const NftStatus = dynamic(
	() => import('../components/clientside/NftStatus'),
	{ ssr: false }
)

import styles from '@components/Nft.module.css'

export default function Nft({ nft, context }) {
	const contractAddress = context.contractAddress;
	const creatorAddress = context.creatorAddress;
	const chainId = context.chainId;
	const tokenId = nft.tokenId;
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

				<NftStatus nft={nft} context={context} />

				<div className={styles.nftDetails}>
					<div className={styles.nftDetailsHeader}>NFT details</div>
					<div>
						{"Token ID : "}{explorerTokenLink(chainId, contractAddress, tokenId)}
					</div>
					<div>
						{"Contract : "}{explorerAddressLink(chainId, contractAddress)}
					</div>
					<div>
						{"Creator : "}{explorerAddressLink(chainId, creatorAddress)}
					</div>
					<div>
						{"IPFS immutable "}
						{ipfsLink(nft.tokenURI, "metadata")}
						{" / "}
						{ipfsLink(nft.metadata.image, "image")}
					</div>
					<div>{"Secondary sale royalty : "}{context.royaltyBasisPoints / 100}{"%"}</div>
					<div>Token type : ERC-721</div>
					<div>Blockchain : {chainSpec(chainId).blockchain}</div>
				</div>
			</div>
		</div>
	)
}