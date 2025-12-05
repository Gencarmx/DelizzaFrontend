import { Search } from "lucide-react"
import "./SearchBar.css"

const SearchBar = ({ placeholder = "Busca restaurantes o comida" }) => {
  return (
    <div className="search-bar">
      <Search size={20} className="search-icon" />
      <input type="text" placeholder={placeholder} className="search-input" />
    </div>
  )
}

export default SearchBar
