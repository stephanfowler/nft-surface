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
    </Layout>
  )
}
