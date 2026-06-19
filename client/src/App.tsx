import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Aquariums from './pages/Aquariums';
import AquariumDetail from './pages/AquariumDetail';
import WaterQuality from './pages/WaterQuality';
import Creatures from './pages/Creatures';
import Feeding from './pages/Feeding';
import Diseases from './pages/Diseases';
import Maintenance from './pages/Maintenance';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/aquariums" element={<Aquariums />} />
        <Route path="/aquariums/:id" element={<AquariumDetail />} />
        <Route path="/water-quality" element={<WaterQuality />} />
        <Route path="/creatures" element={<Creatures />} />
        <Route path="/feeding" element={<Feeding />} />
        <Route path="/diseases" element={<Diseases />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
