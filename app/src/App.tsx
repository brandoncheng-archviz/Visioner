import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CanvasPage from './pages/CanvasPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/canvas/:projectId" element={<CanvasPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
