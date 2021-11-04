import Head from 'next/head'
import Layout from '@components/Layout'
import Image from 'next/image'
import styles from '@components/Layout.module.css'
import frontImage from '../public/frontpage/01.jpg'

export default function Home() {
  return (
    <Layout home>
      <Head>
        {/* homepage meta */}
      </Head>
      <div className={styles.landingImageWrap}>
        <Image
          src={frontImage}
          placeholder ="blur"
          alt="front image"
          priority
          layout="fill"
          objectFit="cover"
          objectPosition="center" />
      </div>
    </Layout>
  )
}