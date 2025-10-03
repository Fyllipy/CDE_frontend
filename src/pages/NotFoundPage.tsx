import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export function NotFoundPage() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>N�o encontramos o que voc� procura.</p>
      <Link className="btn" to="/">Voltar ao in�cio</Link>
    </div>
  );
}
