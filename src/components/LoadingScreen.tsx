import './LoadingScreen.css';

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Carregando o ambiente...</p>
    </div>
  );
}
