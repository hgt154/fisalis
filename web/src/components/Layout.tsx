import { Outlet, useLocation } from 'react-router'
import { useLang } from '../i18n/context'
import ErrorBoundary from './ErrorBoundary'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  const { pathname } = useLocation()
  const { t } = useLang()
  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {/* key: a new page starts with a fresh boundary, so one broken page doesn't stick */}
        <ErrorBoundary key={pathname} fallback={(error) => <p className="note">{t.common.pageError(error.message)}</p>}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  )
}
