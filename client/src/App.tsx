import MainLayout from './components/Layout/MainLayout';
import CanvasPage from './components/Canvas/CanvasPage';
import './index.css';

/**
 * 应用主组件
 */
function App() {
  return (
    <MainLayout>
      <CanvasPage />
    </MainLayout>
  );
}

export default App;
