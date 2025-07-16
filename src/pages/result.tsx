import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { StoredResult } from '../../server/store';

const bgGradient = 'min-h-screen flex items-center justify-center bg-linear-to-br from-yellow-50 via-amber-50 to-orange-50 p-4';
const card = 'max-w-lg w-full bg-white rounded-2xl shadow-xl p-8';

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<StoredResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/result/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) navigate('/', { replace: true });
        else setResult(data);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  function handleShare() {
    if (!result) return;
    const text = `I'm "${result.title}" — ${result.subtitle}! Take the Corn Personality Test to find out yours.`;
    if (navigator.share) {
      navigator.share({ title: 'Corn Personality Test', text });
    } else {
      navigator.clipboard.writeText(text).then(() => alert('Copied!'));
    }
  }

  if (loading) {
    return (
      <main className={bgGradient}>
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🌽</div>
          <p className="text-amber-600 font-medium">Loading your result...</p>
        </div>
      </main>
    );
  }

  if (!result) return null;

  return (
    <main className={bgGradient}>
      <div className={`${card} space-y-6 text-center`}>
        <div className="text-7xl">{result.emoji}</div>
        <div>
          <h1 className="text-3xl font-bold text-amber-800">{result.title}</h1>
          <p className="text-amber-500 font-medium mt-1">{result.subtitle}</p>
        </div>

        <p className="text-gray-600 leading-relaxed">{result.description}</p>

        <div className="flex flex-wrap justify-center gap-2">
          {result.traits.map(t => (
            <span key={t} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              {t}
            </span>
          ))}
        </div>

        <div className="pt-2 space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-lg"
          >
            Try Another Dimension
          </button>
          <button onClick={handleShare} className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors">
            Share Result
          </button>
        </div>

        <div className="text-xs text-gray-300 pt-2">
          {result.dimension} · {result.id.slice(0, 8)}
        </div>
      </div>
    </main>
  );
}
