import Head from 'next/head'
import styles from './Layout.module.css'
import Link from 'next/link'

const name = 'Artist'
export const siteTitle = 'NFT Minter for Artist_Name'

export default function Layout({ children, home }) {
  return (
    <div className={styles.container}>
      <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content={siteTitle} />
        <meta property="og:image" content="" />
        <meta name="og:title" content={siteTitle} />
        <meta name="twitter:card" content="summary_large_image" />
        <link href="https://fonts.googleapis.com/css?family=Cabin:400,700" rel="stylesheet"></link>
      </Head>
      <header className={styles.header}>
        <Link href="/"><a>{name}</a></Link>
        {" | "}
        <Link href="/nft"><a>NFTs</a></Link>
      </header>
      <main>{children}</main>
      <footer className={styles.footer}>
        <Link href="/posts/provenance">
          <a>NFT provenance</a>
        </Link>
      </footer>
    </div>
  )
}