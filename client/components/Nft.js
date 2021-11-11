import { useEffect, useState } from "react";
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import ShortAddress from '@components/ShortAddress'

const Minter = dynamic(
  () => import('../components/clientside/Minter'),
  { ssr: false }
)

import styles from './Nft.module.css'

function getAssetHref(template, address, tokenId) {
    return (template || "").replace("<address>", address).replace("<tokenId>", tokenId) 
}

function getIpfsHref(template, ipfsURI) {
    const ipfsHash = (ipfsURI || "").replace("ipfs://", "");
    return (template || "").replace("<ipfsHash>", ipfsHash);
}

export default function Nft({ nft, chainId }) {
  const [status, setStatus] = useState(nft.status);

  const contractAddress = nft.metadata.contractAddress;
  const creatorAddress = nft.metadata.creatorAddress;
  const tokenId = nft.tokenId;

  const openseaAsset      = getAssetHref(process.env.openseaAsset, contractAddress, tokenId);
  const raribleAsset      = getAssetHref(process.env.raribleAsset, contractAddress, tokenId);
  const etherscanToken    = getAssetHref(process.env.etherscanToken, contractAddress, tokenId);
  const etherscanContract = getAssetHref(process.env.etherscanAddress, contractAddress, tokenId);
  const etherscanCreator  = getAssetHref(process.env.etherscanAddress, creatorAddress, tokenId);
  const ipfsMetadata      = getIpfsHref(process.env.ipfsGateway, nft.tokenURI);
  const ipfsImage         = getIpfsHref(process.env.ipfsGateway, nft.metadata.image);
  
  const width  = nft.metadata.width  || 100;
  const height = nft.metadata.height || 100;
  const orient = width > height ? 'landscape' : 'portrait';
  
  return (
    <div className={styles.nft}>

      <div className={`${styles.nftImage} ${orient}`}>
        <Image
          src={process.env.catalogBaseURL + "/" + nft.webOptimizedImage}
          width={width}
          height={height}
          placeholder = {nft.placeholderImage ? "blur" : "empty"}
          blurDataURL = {nft.placeholderImage}
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
          <Minter nft={nft} chainId={chainId} status={status} setStatus={setStatus} />
        </div>

        {status === 'minted' &&
          <div className={styles.nftTrade}>
            {"Trade it on "} 
            <Link href={openseaAsset}><a className={styles.nftMarket}>OpenSea</a></Link>
            {" or "}
            <Link href={raribleAsset}><a className={styles.nftMarket}>Rarible</a></Link>
          </div>
        }

        <div className={styles.nftDetails}>
        <div className={styles.nftDetailsHeader}>NFT details</div>
        <div>Blockchain : Ethereum</div>
          <div>Token Standard : ERC 721</div>
          <div>
            {"Token ID : "}
            {(status === 'minted' || status === 'burnt') ?
              <Link href={etherscanToken}>
                  <a title="view token on etherscan">{tokenId}</a>
              </Link>
              :
              <span>{tokenId}{" (proposed)"}</span>
            }
          </div>
          <div>
              {"Contract : "}
              <Link href={etherscanContract}>
                  <a title="view contract on etherscan">
                      <ShortAddress address={contractAddress} />
                  </a>
              </Link>
          </div>
          <div>
              {"Creator : "}
              <Link href={etherscanCreator}>
                  <a title="view creator on etherscan">
                      <ShortAddress address={creatorAddress} />
                  </a>
              </Link>
          </div>
          <div>
              {"IPFS immutable "}
              <Link href={ipfsImage}>
                  <a title="view image on IPFS">image</a>
              </Link>
              {" | "}
              <Link href={ipfsMetadata}>
                  <a title="view image on IPFS">metadata</a>
              </Link>
          </div>
        </div>
      </div>
    </div>
  )
}