import Image from 'next/image'
import Link from 'next/link'

import styles from './Nft.module.css'

export default function NftThumbnail({ nft, index }) {
	const width = nft.metadata.width || 100;
	const height = nft.metadata.height || 100;
	const orient = width > height ? styles.landscape : styles.portrait;

	if (nft.status === "burnt") {
		return <></>
	} else {
		return (
			<div className={styles.nftThumb}>
				<div className={`${styles.nftThumbImage} ${orient}`}>
					<Link href={`/nft/${nft.tokenId}`}>
						<a>
							<Image
								src={process.env.catalogBase + "/" + nft.webOptimizedImage}
								width={width}
								height={height}
								placeholder={nft.placeholderImage ? "blur" : "empty"}
								blurDataURL={nft.placeholderImage}
								alt={nft.metadata.name}
								priority={index < 0}
								layout="responsive" />
						</a>
					</Link>
				</div>
				<div className={styles.nftMetadata}>
					<Link href={`/nft/${nft.tokenId}`}>
						<div className={styles.nftName}><a>{nft.metadata.name}</a></div>
					</Link>
					<div className={styles.nftCreatorAndDate}>{nft.metadata.creator} {nft.metadata.date}</div>
					<div className={styles.nftEdition}>Edition {nft.metadata.edition || "1 / 1"}</div>
				</div>
			</div>
		)
	}
}