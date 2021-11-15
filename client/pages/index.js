import Head from 'next/head'
import Layout from '@components/Layout'
import Image from 'next/image'
import Link from 'next/link'
import styles from '@components/Layout.module.css'
import frontImage from '@public/frontpage/02.jpg'

export default function Home() {
  return (
    <Layout home>
      <Head>
        {/* homepage meta */}
      </Head>

      <Image
        className={styles.landingHeroImage}
        src={frontImage}
        placeholder ="blur"
        alt="front image"
        priority
        layout="fill"
        objectFit="cover"
        objectPosition="center" />

      <div className={styles.landingHeroTextA}>{process.env.creatorName}</div>
      <Link href="/nft">
        <a  className={styles.landingHeroTextB}>
          NFT<br />CATALOG
        </a>
      </Link>
      <Link href="https://rinkeby.etherscan.io/address/0x72dAd71E89a5e4ED46754b0A0fb28Cb6AF721844">
        <span className={styles.landingAddress}>
          FLOF ethereum address : <a>0x72dA...1844</a>
        </span>
      </Link>
    </Layout>
  )
}
