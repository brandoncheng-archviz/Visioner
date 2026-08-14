import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CanvasPage from './pages/CanvasPage';
import ProjectLibrary from './pages/ProjectLibrary';

function App() {
  useEffect(() => {
    const preventBrowserWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    document.addEventListener('wheel', preventBrowserWheelZoom, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener('wheel', preventBrowserWheelZoom, {
        capture: true,
      });
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<ProjectLibrary />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/canvas/:projectId" element={<CanvasPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
