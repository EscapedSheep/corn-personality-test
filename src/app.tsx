import { Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import Result from './pages/result';
import Room from './pages/room';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/result/:id" element={<Result />} />
      <Route path="/room/:id" element={<Room />} />
    </Routes>
  );
}
