import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { dimensions } from '../data/questions';
import type { Question, UserAnswer } from '../data/questions';

interface PlayerInfo {
  playerId: string;
  playerName: string;
  answered: number;
  total: number;
  finished: boolean;
}

interface RevealedResult {
  playerName: string;
  resultId: string;
}

interface ChatMsg {
  playerName: string;
  message: string;
}

type Step = 'lobby' | 'dimension-select' | 'quiz' | 'waiting' | 'reveal';

const bgGradient = 'min-h-screen bg-linear-to-br from-yellow-50 via-amber-50 to-orange-50 p-4';

function playersFromNames(
  names: string[],
  existing: PlayerInfo[],
  total: number,
): PlayerInfo[] {
  return names.map((name) => {
    const prev = existing.find((p) => p.playerName === name);
    return prev
      ? { ...prev, total }
      : { playerId: '', playerName: name, answered: 0, total, finished: false };
  });
}

export default function Room() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [step, setStep] = useState<Step>('lobby');
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dimension, setDimension] = useState<string>('');
  const [current, setCurrent] = useState(0);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [revealed, setRevealed] = useState<RevealedResult[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isHost, setIsHost] = useState(false);

  const answersRef = useRef<string[]>([]);
  const mySocketIdRef = useRef<string>('');

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  function setupSocketListeners(socket: Socket) {
    socket.on('room:created', (data: { roomId: string; questions: Question[]; dimension: string }) => {
      setQuestions(data.questions);
      setDimension(data.dimension);
      setPlayers([{ playerId: 'self', playerName, answered: 0, total: data.questions.length, finished: false }]);
      setStep('quiz');
      answersRef.current = new Array(data.questions.length).fill('');
    });

    socket.on('room:joined', (data: { roomId: string; dimension: string; questions: Question[]; players: string[] }) => {
      setQuestions(data.questions);
      setDimension(data.dimension);
      setPlayers(playersFromNames(data.players, [], data.questions.length));
      setStep('quiz');
      answersRef.current = new Array(data.questions.length).fill('');
    });

    socket.on('player:joined', (data: { playerName: string; players: string[] }) => {
      setPlayers(prev => playersFromNames(data.players, prev, questions.length || 5));
    });

    socket.on('player:left', (data: { playerName: string; players: string[] }) => {
      setPlayers(prev => playersFromNames(data.players, prev, questions.length || 5));
    });

    socket.on('quiz:progress', (data: { playerId: string; playerName: string; answered: number; total: number }) => {
      setPlayers(prev => prev.map(p =>
        p.playerId === data.playerId || p.playerName === data.playerName
          ? { ...p, playerId: data.playerId, answered: data.answered, total: data.total }
          : p
      ));
    });

    socket.on('player:finished', (data: { playerName: string }) => {
      setPlayers(prev => prev.map(p =>
        p.playerName === data.playerName ? { ...p, finished: true } : p
      ));
    });

    socket.on('room:all-finished', () => {
      setStep('waiting');
    });

    socket.on('result:revealed', (data: RevealedResult) => {
      setRevealed(prev => [...prev, data]);
    });

    socket.on('chat:message', (data: ChatMsg) => {
      setChat(prev => [...prev, data]);
    });
  }

  function hostRoom(name: string, dim: string) {
    setPlayerName(name);
    setDimension(dim);
    setNameSubmitted(true);
    setIsHost(true);

    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      mySocketIdRef.current = socket.id ?? '';
      socket.emit('room:create', { roomId, dimension: dim, playerName: name });
    });

    setupSocketListeners(socket);
  }

  function joinRoom(name: string) {
    setPlayerName(name);
    setNameSubmitted(true);

    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      mySocketIdRef.current = socket.id ?? '';
      socket.emit('room:join', { roomId, playerName: name });
    });

    setupSocketListeners(socket);
  }

  function answerQuestion(option: string) {
    const socket = socketRef.current;
    if (!socket) return;

    answersRef.current[current] = option;
    socket.emit('quiz:answer', { roomId, questionIndex: current, option });

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      socket.emit('quiz:finish', { roomId });
    }
  }

  async function submitResultToRoom() {
    const socket = socketRef.current;
    if (!socket) return;

    const answers: UserAnswer[] = questions.map((q, i) => ({
      questionId: q.id,
      answer: answersRef.current[i] || q.options[0],
    }));

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimension, answers }),
      });
      const data = await res.json();
      if (data.id) {
        socket.emit('result:submit', { roomId, resultId: data.id });
        setStep('reveal');
        return;
      }
    } catch {
      // Server unreachable — fall through to local id
    }

    const id = 'local-' + Date.now();
    socket.emit('result:submit', { roomId, resultId: id });
    setStep('reveal');
  }

  function sendChat() {
    const socket = socketRef.current;
    if (!socket || !chatInput.trim()) return;
    socket.emit('chat:message', { roomId, message: chatInput.trim() });
    setChat(prev => [...prev, { playerName: 'You', message: chatInput.trim() }]);
    setChatInput('');
  }

  // ── Lobby: name entry ──
  if (!nameSubmitted) {
    return (
      <main className={bgGradient}>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6 mt-12">
          <h2 className="text-xl font-semibold text-amber-800 text-center">Enter the Room</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') joinRoom(playerName); }}
              placeholder="Your name"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-amber-400 outline-none text-center text-lg"
              autoFocus
            />
            <button
              onClick={() => joinRoom(playerName)}
              disabled={!playerName.trim()}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
            >
              Join Room
            </button>
          </div>
          <p className="text-sm text-gray-400 text-center">Room: {roomId}</p>
        </div>
      </main>
    );
  }

  // ── Host dimension select ──
  if (step === 'dimension-select') {
    return (
      <main className={bgGradient}>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6 mt-12">
          <h2 className="text-xl font-semibold text-amber-800 text-center">Pick a dimension</h2>
          <div className="space-y-3">
            {dimensions.map(d => (
              <button
                key={d.id}
                onClick={() => hostRoom(playerName, d.id)}
                className="w-full text-left py-4 px-5 border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50 rounded-xl transition-all"
              >
                <div className="font-semibold text-gray-800">{d.name}</div>
                <div className="text-sm text-gray-400 mt-1">{d.subtitle}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Quiz ──
  if (step === 'quiz' && questions.length > 0) {
    const q = questions[current];
    const progress = ((current + 1) / questions.length) * 100;

    return (
      <main className={bgGradient}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{current + 1}/{questions.length}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">{q.text}</h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => answerQuestion(opt)}
                  className="w-full text-left py-4 px-5 border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50 rounded-xl transition-all text-gray-700 font-medium"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-700">Players</h3>
              {players.map(p => (
                <div key={p.playerName} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{p.playerName}</span>
                  <span className="text-amber-500">
                    {p.finished ? '✓ Done' : `${p.answered}/${p.total}`}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-4 space-y-3 flex flex-col h-80">
              <h3 className="font-semibold text-gray-700">Chat</h3>
              <div className="flex-1 overflow-y-auto space-y-1 text-sm">
                {chat.map((m, i) => (
                  <div key={i}>
                    <span className="font-medium text-amber-600">{m.playerName}: </span>
                    <span className="text-gray-600">{m.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                  placeholder="Trash talk..."
                  className="flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-400"
                />
                <button onClick={sendChat} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Waiting ──
  if (step === 'waiting') {
    return (
      <main className={bgGradient}>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center mt-12">
          <div className="text-6xl animate-bounce">🌽</div>
          <h2 className="text-xl font-semibold text-amber-800">Everyone&apos;s done!</h2>
          <button onClick={submitResultToRoom} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors">
            Reveal My Result
          </button>
        </div>
      </main>
    );
  }

  // ── Reveal ──
  if (step === 'reveal') {
    return (
      <main className={bgGradient}>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center mt-12">
          <div className="text-6xl">🎉</div>
          <h2 className="text-xl font-semibold text-amber-800">Results</h2>
          <div className="space-y-3">
            {revealed.map(r => (
              <button
                key={r.playerName}
                onClick={() => navigate(`/result/${r.resultId}`)}
                className="w-full text-left py-4 px-5 border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl transition-all"
              >
                <span className="font-semibold text-gray-800">{r.playerName}</span>
                <span className="text-amber-500 text-sm ml-2">→ View Result</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  return null;
}
