/* maps each URL to a page.*/

import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import CountryPage from './pages/CountryPage'
import IndicatorsPage from './pages/IndicatorsPage'
import TradePage from './pages/TradePage'
import TheoriesPage from './pages/TheoriesPage'
import NewsPage from './pages/NewsPage'
import NotFoundPage from './pages/NotFoundPage'
import TheoryPage from './pages/TheoryPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="mapa" element={<MapPage />} />
        <Route path="pais/:iso3" element={<CountryPage />} />
        <Route path="indicadores" element={<IndicatorsPage />} />
        <Route path="comercio" element={<TradePage />} />
        <Route path="teorias" element={<TheoriesPage />} />
        <Route path="noticias" element={<NewsPage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route path="teorias" element={<TheoriesPage />} />
        <Route path="teorias/:slug" element={<TheoryPage />} />
      </Route>
    </Routes>
  )
}