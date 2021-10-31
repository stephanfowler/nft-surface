import Link from 'next/link'

import styles from './Footer.module.css'

export default function Footer() {
  return (
    <>
      <footer className={styles.footer}>
        <Link href="/posts/provenance">
          <a>NFT provenance</a>
        </Link>
      </footer>
    </>
  )
}
