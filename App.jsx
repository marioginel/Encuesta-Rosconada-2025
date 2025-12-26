import React, { useState, useEffect } from 'react';
import { Crown, Star, Gift, Printer, Snowflake, PartyPopper, Heart, Send, BarChart3, Lock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

// --- PEGA AQUÍ LO QUE COPIASTE DE FIREBASE ---
// Borra estas líneas de ejemplo y pon las tuyas:
const firebaseConfig = {
  apiKey: "AIzaSyBhr91LlpxEF2KUMIUlNCZ_VBqd5EviEjA",
  authDomain: "encuesta-rosconada-2025.firebaseapp.com",
  projectId: "encuesta-rosconada-2025",
  storageBucket: "encuesta-rosconada-2025.firebasestorage.app",
  messagingSenderId: "245541045856",
  appId: "1:245541045856:web:feceb8f7cc950cfbbda505",
  measurementId: "G-7NKLBHSEMP"
};
// ----------------------------------------------

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const RosconadaScorecard = () => {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('welcome'); 
  const [participantName, setParticipantName] = useState('');
  const [scores, setScores] = useState(Array(6).fill({ rating: null, notes: '' }));
  const [bestOutfit, setBestOutfit] = useState('');
  const [allVotes, setAllVotes] = useState([]);
  const [resultsData, setResultsData] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.error("Error Auth", error));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'results' && user) {
        const q = query(collection(db, 'rosconada_votes'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const votes = snapshot.docs.map(doc => doc.data());
            setAllVotes(votes);
            calculateResults(votes);
        });
        return () => unsubscribe();
    }
  }, [mode, user]);

  const handleRating = (index, rating) => {
    const newScores = [...scores];
    newScores[index] = { ...newScores[index], rating };
    setScores(newScores);
  };

  const handleNotes = (index, notes) => {
    const newScores = [...scores];
    newScores[index] = { ...newScores[index], notes };
    setScores(newScores);
  };

  const submitVotes = async () => {
    if (!participantName.trim()) { alert("¡Dinos quién eres!"); return; }
    try {
        await addDoc(collection(db, 'rosconada_votes'), {
            participant: participantName,
            scores: scores,
            bestOutfit: bestOutfit,
            timestamp: new Date().toISOString()
        });
        setMode('submitted');
    } catch (error) {
        console.error("Error:", error);
        alert("Error al enviar. ¿Tienes internet?");
    }
  };

  const calculateResults = (votes) => {
      if (votes.length === 0) return;
      const rosconStats = Array(6).fill(0).map((_, i) => ({ id: i, totalPoints: 0, count: 0 }));
      const outfitVotes = {};

      votes.forEach(vote => {
          vote.scores.forEach((score, index) => {
              if (score.rating) {
                  rosconStats[index].totalPoints += score.rating;
                  rosconStats[index].count += 1;
              }
          });
          if (vote.bestOutfit) {
              const name = vote.bestOutfit.toLowerCase().trim();
              outfitVotes[name] = (outfitVotes[name] || 0) + 1;
          }
      });

      const processedRoscones = rosconStats.map(r => ({
          ...r,
          average: r.count > 0 ? (r.totalPoints / r.count).toFixed(2) : 0
      })).sort((a, b) => b.average - a.average);

      const sortedOutfits = Object.entries(outfitVotes).sort(([,a], [,b]) => b - a);
      setResultsData({ roscones: processedRoscones, outfits: sortedOutfits });
  };

  const kingsIcons = [
    <Crown key="1" className="w-5 h-5 text-yellow-600" />,
    <Gift key="2" className="w-5 h-5 text-red-600" />,
    <Star key="3" className="w-5 h-5 text-yellow-500" />,
    <Snowflake key="4" className="w-5 h-5 text-blue-400" />,
    <PartyPopper key="5" className="w-5 h-5 text-purple-500" />,
    <Heart key="6" className="w-5 h-5 text-pink-500" />
  ];

  const ratingOptions = [
    { value: 1, label: 'Sin más', icon: '😐', color: 'bg-gray-100' },
    { value: 2, label: 'Normal', icon: '🙂', color: 'bg-blue-50' },
    { value: 3, label: 'Love it', icon: '😍', color: 'bg-red-50' }
  ];

  if (mode === 'welcome') {
      return (
        <div className="min-h-screen bg-green-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-amber-50 rounded-xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-yellow-600">
                <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-red-800 mb-2 font-serif">ROSCONADA 2025</h1>
                <input type="text" placeholder="Tu Nombre" value={participantName} onChange={(e) => setParticipantName(e.target.value)} className="w-full p-3 border-2 border-amber-300 rounded-lg mb-4 text-center text-lg outline-none bg-white" />
                <button onClick={() => { if(participantName) setMode('voting'); else alert("¡Pon tu nombre!"); }} className="w-full bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg mb-4">EMPEZAR CATA</button>
                <button onClick={() => setMode('results')} className="text-xs text-gray-400 flex items-center justify-center gap-1 mx-auto mt-8"><Lock className="w-3 h-3" /> Acceso Anfitrión</button>
            </div>
        </div>
      );
  }

  if (mode === 'results') {
      return (
        <div className="min-h-screen bg-gray-900 p-4 font-sans text-white">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-yellow-400 flex items-center gap-2"><BarChart3 /> Resultados</h1>
                    <button onClick={() => setMode('welcome')} className="text-sm text-gray-400">Salir</button>
                </div>
                {!resultsData ? <p className="text-center animate-pulse">Esperando votos...</p> : (
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600/30">
                            <h2 className="text-xl font-bold mb-4 text-center text-yellow-200">🏆 Ranking</h2>
                            {resultsData.roscones.map((r, i) => (
                                <div key={r.id} className="flex items-center gap-3 bg-gray-700 p-3 rounded mb-2">
                                    <div className="text-2xl font-bold w-8 text-yellow-400">#{i+1}</div>
                                    <div className="flex-grow"><div className="font-bold">Roscón {r.id + 1}</div><div className="text-xs text-gray-400">{r.count} votos</div></div>
                                    <div className="text-2xl font-bold text-green-400">{r.average}</div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 border border-green-600/30">
                            <h2 className="text-xl font-bold mb-4 text-center text-green-200">👗 Mejor Atuendo</h2>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {resultsData.outfits.map(([name, count]) => (
                                    <div key={name} className="bg-green-900 px-3 py-1 rounded-full border border-green-700 flex gap-2">
                                        <span className="capitalize font-bold">{name}</span><span className="bg-green-200 text-green-900 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  }

  if (mode === 'submitted') {
      return (
        <div className="min-h-screen bg-green-800 flex items-center justify-center p-4 text-center text-white">
            <div className="animate-bounce">
                <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold mb-2">¡Enviado!</h1>
                <p className="text-green-200">Gracias, {participantName}.</p>
                <button onClick={() => setMode('welcome')} className="mt-8 text-sm underline text-green-300">Volver</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-green-900 p-4 pb-24 font-sans">
      <div className="max-w-3xl mx-auto bg-amber-50 rounded-xl shadow-2xl border-4 border-yellow-600 p-4">
        <div className="bg-red-700 text-white p-4 flex justify-between items-center rounded-lg mb-4">
          <span className="font-bold uppercase">Rosconada '25</span>
          <span className="text-sm bg-red-800 px-3 py-1 rounded-full">👤 {participantName}</span>
        </div>
        <div className="space-y-4">
            {scores.map((score, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-amber-100 p-1.5 rounded-full">{kingsIcons[index]}</div>
                  <span className="font-bold text-lg text-gray-800">Roscón {index + 1}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ratingOptions.map((option) => (
                    <button key={option.value} onClick={() => handleRating(index, option.value)} className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 ${score.rating === option.value ? 'border-yellow-500 bg-yellow-50' : 'border-transparent bg-gray-50'}`}>
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-[10px] font-bold uppercase text-gray-600">{option.label}</span>
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="Notas..." value={score.notes} onChange={(e) => handleNotes(index, e.target.value)} className="w-full text-sm border-b border-gray-200 mt-2 outline-none" />
              </div>
            ))}
             <div className="bg-green-50 p-4 rounded-lg border-2 border-dashed border-green-300 mt-4">
                <h3 className="font-bold text-green-800 text-sm uppercase mb-2">🎁 Mejor Atuendo</h3>
                <input type="text" value={bestOutfit} onChange={(e) => setBestOutfit(e.target.value)} placeholder="¿Quién gana?" className="w-full bg-white border border-green-200 rounded p-2 text-sm outline-none" />
            </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 border-t border-gray-200">
        <button onClick={submitVotes} className="w-full bg-yellow-500 text-red-900 font-bold p-3 rounded-xl shadow-lg flex justify-center gap-2"><Send className="w-5 h-5" /> ENVIAR</button>
      </div>
    </div>
  );
};

export default RosconadaScorecard;