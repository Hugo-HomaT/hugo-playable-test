import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { ProjectHub } from './pages/ProjectHub';
import { Editor } from './pages/Editor';
import { MediaLibrary } from './pages/MediaLibrary';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="project/:id" element={<ProjectHub />} />
          <Route path="project/:id/concept/:conceptId" element={<Editor />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
