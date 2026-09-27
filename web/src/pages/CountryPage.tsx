import { useParams } from 'react-router'

export default function CountryPage() {
  const { iso3 } = useParams()
  return <h1>Perfil do país: {iso3}</h1>
}