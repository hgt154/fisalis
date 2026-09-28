import { Outlet } from 'react-router'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}