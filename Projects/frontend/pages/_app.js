import React from 'react'
import Layout from '../components/Layout'
import '../styles/globals.css'
import { useRouter } from 'next/router'

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const hideLayout = router.pathname === '/login' || router.pathname === '/register'

  if (hideLayout) return <Component {...pageProps} />

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

export default MyApp
