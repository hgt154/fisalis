import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import CountryPage from './pages/CountryPage'
import IndicatorsPage from './pages/IndicatorsPage'
import TradePage from './pages/TradePage'
import ConflictsPage from './pages/ConflictsPage'
import WorldTradePage from './pages/WorldTradePage'
import TheoriesPage from './pages/TheoriesPage'
import TheoryPage from './pages/TheoryPage'
import HistoryPage from './pages/HistoryPage'
import RulerPage from './pages/RulerPage'
import NewsPage from './pages/NewsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="mapa" element={<MapPage />} />
        <Route path="pais/:iso3" element={<CountryPage />} />
        <Route path="indicadores" element={<IndicatorsPage />} />
        <Route path="comercio" element={<TradePage />} />
        <Route path="comercio/mundo" element={<WorldTradePage />} />
        <Route path="conflitos" element={<ConflictsPage />} />
        <Route path="teorias" element={<TheoriesPage />} />
        <Route path="teorias/:slug" element={<TheoryPage />} />
        <Route path="historia" element={<HistoryPage />} />
        <Route path="historia/:iso3/:slug" element={<RulerPage />} />
        <Route path="noticias" element={<NewsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
