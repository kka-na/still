import { useState } from 'react';
import HomeView from './components/HomeView';
import CategoryView from './components/CategoryView';
import CameraView from './components/CameraView';

export default function App() {
  const [view, setView] = useState('home');          // 'home' | 'category' | 'camera'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openCategory = (cat) => {
    setSelectedCategory(cat);
    setView('category');
  };

  const openCamera = () => {
    setView('camera');
  };

  const backToHome = () => {
    setSelectedCategory(null);
    setView('home');
    setRefreshKey(k => k + 1);
  };

  const backToCategory = () => {
    setView('category');
    setRefreshKey(k => k + 1);
  };

  const handlePhotoTaken = () => {
    setRefreshKey(k => k + 1);
  };

  if (view === 'camera' && selectedCategory) {
    return (
      <CameraView
        category={selectedCategory}
        onBack={backToCategory}
        onPhotoTaken={handlePhotoTaken}
      />
    );
  }

  if (view === 'category' && selectedCategory) {
    return (
      <CategoryView
        key={refreshKey}
        category={selectedCategory}
        onBack={backToHome}
        onOpenCamera={openCamera}
        onRefresh={() => setRefreshKey(k => k + 1)}
      />
    );
  }

  return (
    <HomeView
      key={refreshKey}
      onSelectCategory={openCategory}
    />
  );
}
