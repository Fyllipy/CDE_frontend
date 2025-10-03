import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export function NotFoundPage() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Não encontramos o que você procura.</p>
      <Link className="btn" to="/">Voltar ao início</Link>
    </div>
  );
}
