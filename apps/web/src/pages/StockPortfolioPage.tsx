import { Link } from 'react-router-dom';
import { StockPortfolioView } from '../components/StockPortfolioView.js';

export function StockPortfolioPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
          ← Retour au tableau de bord
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Portefeuille d'actions</h1>
      </div>

      <StockPortfolioView />
    </div>
  );
}
