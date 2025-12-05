import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import AddressSelector from "../components/AddressSelector"
import CategorySlider from "../components/CategorySlider"
import FeaturedProducts from "../components/FeaturedProducts"
import RestaurantList from "../components/RestaurantList"
import "./Home.css"

const Home = () => {
  return (
    <div className="page">
      <Header />
      <div className="container">
        <AddressSelector />
        <div className="question-banner">
          <span className="question-text">¿Que se te antoja hoy?</span>
        </div>
        <CategorySlider />
        <FeaturedProducts />
        <RestaurantList />
      </div>
      <BottomNav />
    </div>
  )
}

export default Home
