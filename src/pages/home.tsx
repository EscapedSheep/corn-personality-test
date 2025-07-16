import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dimensions, generateResult } from '../data/questions';
import type { Question, UserAnswer } from '../data/questions';

const bgGradient = 'min-h-screen flex items-center justify-center bg-linear-to-br from-yellow-50 via-amber-50 to-orange-50 p-4';
const card = 'max-w-lg w-full bg-white rounded-2xl shadow-xl p-8';
const btnBase = 'w-full text-left py-4 px-5 rounded-xl transition-all font-medium';

export default function Home() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<'dimension' | 'quiz'>('dimension');
  const [dimension, setDimension] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [roomId, setRoomId] = useState('');

  async function startQuiz(dim: string) {
    setLoading(true);
    setDimension(dim);
    const res = await fetch(`/api/quiz?dimension=${dim}`);
    const data = await res.json();
    setQuestions(data.questions);
    setCurrent(0);
    setAnswers([]);
    setScreen('quiz');
    setLoading(false);
  }

  function answer(option: string) {
    const q = questions[current];
    const next = [...answers, { questionId: q.id, answer: option }];
    setAnswers(next);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      submit(next);
    }
  }

  async function submit(final: UserAnswer[]) {
    setLoading(true);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dimension, answers: final }),
    });
    const data = await res.json();
    if (data.id) navigate(`/result/${data.id}`);
  }

  function enterRoom() {
    const id = roomId.trim() || Math.random().toString(36).slice(2, 8);
    navigate(`/room/${id}`);
  }

  if (screen === 'dimension') {
    return (
      <main className={bgGradient}>
        <div className={`${card} text-center space-y-6`}>
          <div className="text-7xl">🌽</div>
          <h1 className="text-3xl font-bold text-amber-800">The Corn Personality Test</h1>
          <p className="text-gray-500 leading-relaxed">
            Answer 5 profoundly stupid questions. Get a title you don&apos;t deserve.
            <br />
            <span className="text-sm text-amber-500">Not scientific. Probably more accurate than your star sign.</span>
          </p>

          <div className="space-y-3 pt-2">
            {dimensions.map(dim => (
              <button
                key={dim.id}
                onClick={() => startQuiz(dim.id)}
                disabled={loading}
                className={`${btnBase} border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50 group disabled:opacity-50`}
              >
                <div className="font-semibold text-gray-800 text-lg group-hover:text-amber-800">{dim.name}</div>
                <div className="text-sm text-gray-400 mt-1">{dim.subtitle}</div>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            {!showRoomInput ? (
              <button
                onClick={() => setShowRoomInput(true)}
                className={`${btnBase} border-2 border-green-200 hover:border-green-400 hover:bg-green-50 text-green-700 font-semibold text-center`}
              >
                👥 Play with Friends
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  placeholder="Room code (leave empty for random)"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-400 outline-none text-center text-sm"
                />
                <button onClick={enterRoom} className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors">
                  Enter Room
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-300 pt-2">
            ⏱️ ~2 minutes · 5 questions · zero ads
          </div>
        </div>
      </main>
    );
  }

  if (screen === 'quiz' && questions.length > 0) {
    const q = questions[current];
    const progress = ((current + 1) / questions.length) * 100;
    return (
      <main className={bgGradient}>
        <div className={`${card} space-y-6`}>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{current + 1}/{questions.length}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 leading-relaxed">{q.text}</h2>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => answer(opt)}
                className={`${btnBase} border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50 text-gray-700`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={bgGradient}>
      <div className="text-center space-y-4">
        <div className="text-6xl animate-bounce">🌽</div>
        <p className="text-amber-600 font-medium">Analyzing your corn personality...</p>
      </div>
    </main>
  );
}
