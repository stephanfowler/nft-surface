import Head from 'next/head'
import Layout, { siteTitle } from '@components/Layout'

export default function Home() {
  return (
    <Layout home>
      <Head>
        <title>{siteTitle}</title>
      </Head>
    </Layout>
  )
}