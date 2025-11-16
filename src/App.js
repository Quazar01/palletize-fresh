import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ProductsPage from './pages/ProductsPage';
import InitializeFirebase from './components/InitializeFirebase';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/init-firebase" element={<InitializeFirebase />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
