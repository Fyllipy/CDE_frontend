import { AppRouter } from './routes/AppRouter';
import { useAuthInitializer } from './hooks/useAuthInitializer';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const initializing = useAuthInitializer();

  if (initializing) {
    return <LoadingScreen />;
  }

  return <AppRouter />;
}
