import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Crown, Star, Gift, Send, Lock, BookOpen, Save, PartyPopper, Flame, Download, KeyRound, AlertTriangle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';

// --- TUS CLAVES DE FIREBASE ---
// ¡Copia aquí tus claves de Firebase igual que hiciste la primera vez!
const firebaseConfig = {
  apiKey: "AIzaSyBhr91LlpxEF2KUMIUlNCZ_VBqd5EviEjA",
  authDomain: "encuesta-rosconada-2025.firebaseapp.com",
  projectId: "encuesta-rosconada-2025",
  storageBucket: "encuesta-rosconada-2025.firebasestorage.app",
  messagingSenderId: "245541045856",
  appId: "1:245541045856:web:feceb8f7cc950cfbbda505",
  measurementId: "G-7NKLBHSEMP"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Lista de VIPs (Invitados autorizados)
const ALLOWED_USERS = [
  "Laura", "Mario", "Juanma", "Maria", "Porti", "Angeles", 
  "Kike", "Alba", "Borao", "Ines", "Blasco", "Paula"
];

const App = () => {
  // Estados
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login'); // 'login', 'voting', 'results', 'admin_auth'
  const [participantName, setParticipantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estado para la contraseña de admin
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminError, setAdminError] = useState(false);

  // Datos de votación (8 Roscones)
  const [scores, setScores] = useState(Array(8).fill({ rating: null, notes: '' }));
  const [bestOutfit, setBestOutfit] = useState('');
  
  // Resultados (para modo admin)
  const [resultsData, setResultsData] = useState(null);
  const [rawVotes, setRawVotes] = useState([]); 

  // Autenticación anónima al cargar
  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.error("Error Auth", error));
    onAuthStateChanged(auth, setUser);
  }, []);

  // --- LÓGICA DE USUARIOS ---

  const handleLogin = async (nameInput) => {
    setLoading(true);
    setErrorMsg('');
    
    const cleanInput = nameInput.trim();
    
    const foundName = ALLOWED_USERS.find(
      u => u.toLowerCase() === cleanInput.toLowerCase()
    );

    if (!foundName) {
      setErrorMsg('⛔ ¡Ups! No estás en la lista de invitados de los Reyes Magos.');
      setLoading(false);
      return;
    }

    setParticipantName(foundName);
    await loadUserData(foundName);
    setMode('voting');
    setLoading(false);
  };

  const loadUserData = async (name) => {
    try {
      const docRef = doc(db, 'rosconada_2025_votes', name.toLowerCase());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const loadedScores = data.scores || [];
        const fullScores = [...loadedScores, ...Array(8 - loadedScores.length).fill({ rating: null, notes: '' })];
        
        setScores(fullScores);
        setBestOutfit(data.bestOutfit || '');
      } else {
        setScores(Array(8).fill({ rating: null, notes: '' }));
        setBestOutfit('');
      }
    } catch (e) {
      console.error("Error cargando datos:", e);
    }
  };

  // --- LÓGICA DE ADMINISTRADOR ---
  const handleAdminAuth = () => {
    if (adminPasswordInput === "Marotoesimbecil") {
        setAdminError(false);
        setAdminPasswordInput(''); // Limpiar para la próxima
        setMode('results');
    } else {
        setAdminError(true);
        // Pequeña broma visual o sacudida podría ir aquí
        setTimeout(() => setAdminError(false), 2000);
    }
  };

  // --- GUARDADO DE DATOS ---
  const saveVotes = async (manual = false) => {
    if (!participantName) return;
    
    try {
      await setDoc(doc(db, 'rosconada_2025_votes', participantName.toLowerCase()), {
        participant: participantName,
        scores: scores,
        bestOutfit: bestOutfit,
        lastUpdated: new Date().toISOString()
      });
      
      if (manual) {
        alert("¡Guardado! Puedes seguir editando o cerrar la app.");
      }
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar. Comprueba tu conexión.");
    }
  };

  // --- MANEJO DE INPUTS ---
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

  // --- RESULTADOS Y EXPORTACIÓN ---
  useEffect(() => {
    if (mode === 'results' && user) {
        const q = query(collection(db, 'rosconada_2025_votes'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const votes = snapshot.docs.map(doc => doc.data());
            setRawVotes(votes); 
            calculateResults(votes);
        });
        return () => unsubscribe();
    }
  }, [mode, user]);

  const calculateResults = (votes) => {
      if (votes.length === 0) return;
      
      const rosconStats = Array(8).fill(0).map((_, i) => ({ 
        id: i, totalPoints: 0, count: 0, comments: [] 
      }));
      const outfitVotes = {};

      votes.forEach(vote => {
          vote.scores.forEach((score, index) => {
              if (index < 8 && score.rating) {
                  rosconStats[index].totalPoints += score.rating;
                  rosconStats[index].count += 1;
                  if(score.notes) rosconStats[index].comments.push(`${vote.participant}: ${score.notes}`);
              }
          });
          if (vote.bestOutfit) {
              const name = vote.bestOutfit.trim().toLowerCase();
              if (name) outfitVotes[name] = (outfitVotes[name] || 0) + 1;
          }
      });

      const processedRoscones = rosconStats.map(r => ({
          ...r,
          average: r.count > 0 ? (r.totalPoints / r.count).toFixed(2) : "0.00"
      })).sort((a, b) => parseFloat(b.average) - parseFloat(a.average));

      const sortedOutfits = Object.entries(outfitVotes).sort(([,a], [,b]) => b - a);
      setResultsData({ roscones: processedRoscones, outfits: sortedOutfits });
  };

  const exportToCSV = () => {
    if (rawVotes.length === 0) return alert("No hay votos para exportar");

    let csvContent = "Participante,Mejor Atuendo,";
    for(let i=0; i<8; i++) {
        csvContent += `Roscon ${i+1} Puntos,Roscon ${i+1} Notas,`;
    }
    csvContent += "\n";

    rawVotes.forEach(vote => {
        let row = `"${vote.participant}","${vote.bestOutfit || ''}",`;
        for(let i=0; i<8; i++) {
            const score = vote.scores[i] || { rating: '', notes: '' };
            const cleanNote = (score.notes || '').replace(/(\r\n|\n|\r)/gm, " "); 
            row += `${score.rating || ''},"${cleanNote}",`;
        }
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Resultados_Rosconada_2025.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- UI HELPERS ---
  const ratingOptions = [
    { value: 1, label: 'Sin más', emoji: '😐', color: 'bg-stone-100 border-stone-300' },
    { value: 2, label: 'Normal', emoji: '🙂', color: 'bg-blue-50 border-blue-200' },
    { value: 3, label: 'Love it', emoji: '😍', color: 'bg-red-50 border-red-200' }
  ];

  // Pantalla LOGIN
  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black p-4 flex items-center justify-center font-serif text-white">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-yellow-500/50 max-w-sm w-full text-center shadow-[0_0_40px_rgba(234,179,8,0.2)]">
          <div className="flex justify-center gap-4 mb-6">
             <span className="text-4xl">👑</span>
             <span className="text-4xl">👑</span>
             <span className="text-4xl">👑</span>
          </div>
          <h1 className="text-3xl font-bold text-yellow-400 mb-2 tracking-widest uppercase">Rosconada<br/>2025</h1>
          <p className="text-blue-200 mb-8 text-sm">Edición Reyes & Amigos</p>
          
          <div className="space-y-4">
            <label className="block text-left text-xs font-bold uppercase tracking-wider text-yellow-500/80 mb-1">Selecciona tu nombre:</label>
            <select 
              className="w-full bg-black/40 border border-yellow-600/30 rounded-lg p-4 text-lg text-white outline-none focus:border-yellow-400"
              onChange={(e) => handleLogin(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>¿Quién eres?</option>
              {ALLOWED_USERS.map(name => (
                <option key={name} value={name} className="text-black">{name}</option>
              ))}
            </select>
          </div>

          {errorMsg && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-2 rounded animate-pulse">{errorMsg}</p>}
          
          {loading && <p className="text-yellow-200 mt-4 text-sm animate-pulse">Consultando a los pajes reales...</p>}

          <div className="mt-12 pt-6 border-t border-white/10">
            {/* Cambiado: Ahora lleva al modo admin_auth en vez de results directo */}
            <button onClick={() => setMode('admin_auth')} className="text-xs text-gray-500 hover:text-yellow-500 flex items-center justify-center gap-2 mx-auto transition-colors">
              <Lock className="w-3 h-3" /> Acceso Real (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla PASSWORD ADMIN (NUEVA)
  if (mode === 'admin_auth') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-serif p-4">
        <div className="bg-stone-900 p-8 rounded-xl border border-red-800 shadow-2xl w-full max-w-xs text-center relative overflow-hidden">
            {/* Fondo animado sutil */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
            
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-500 mb-2 uppercase tracking-widest">Zona Prohibida</h2>
            <p className="text-xs text-stone-400 mb-6">Introduce la clave secreta de la Logia del Roscón.</p>
            
            <input 
                type="password" 
                autoFocus
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Contraseña..."
                className={`w-full bg-black border ${adminError ? 'border-red-500 animate-shake' : 'border-stone-700'} rounded p-3 mb-4 text-white text-center outline-none focus:border-yellow-500 transition-all`}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
            />
            
            <button 
                onClick={handleAdminAuth}
                className="w-full bg-red-900 hover:bg-red-800 text-white font-bold py-2 rounded mb-4 transition-colors border border-red-700"
            >
                ENTRAR
            </button>

            <button onClick={() => setMode('login')} className="text-stone-500 text-xs hover:text-white underline">
                Volver a zona segura
            </button>

            {adminError && (
                <p className="text-red-500 text-xs mt-4 font-bold animate-pulse">
                    🚫 ACCESO DENEGADO (Carbón para ti)
                </p>
            )}
            
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
            `}</style>
        </div>
      </div>
    );
  }

  // Pantalla RESULTADOS
  if (mode === 'results') {
    return (
        <div className="min-h-screen bg-slate-900 p-4 font-sans text-white">
            <div className="max-w-3xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800 p-4 rounded-xl border border-slate-700 gap-4">
                    <h1 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                        <PartyPopper /> Resultados Finales
                    </h1>
                    <div className="flex gap-2">
                        <button 
                            onClick={exportToCSV}
                            className="text-sm bg-green-700 hover:bg-green-600 px-4 py-2 rounded flex items-center gap-2 font-bold transition-colors shadow-lg border border-green-500"
                        >
                            <Download className="w-4 h-4" /> Exportar Excel
                        </button>
                        <button onClick={() => setMode('login')} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded border border-slate-500">Salir</button>
                    </div>
                </div>

                {!resultsData ? <div className="text-center p-10"><div className="animate-spin text-4xl mb-2">🐫</div>Cargando votos...</div> : (
                    <div className="space-y-8">
                        {/* RANKING */}
                        <div className="bg-slate-800 rounded-xl p-6 border border-yellow-500/20 shadow-xl">
                            <h2 className="text-xl font-bold mb-6 text-center text-yellow-200 tracking-wider flex items-center justify-center gap-2"><Crown className="text-yellow-500"/> PODIUM DE ROSCONES</h2>
                            <div className="space-y-4">
                                {resultsData.roscones.map((r, i) => (
                                    <div key={r.id} className="bg-slate-700/50 rounded-lg p-4 transition-all hover:bg-slate-700 border border-slate-600/50">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className={`text-3xl font-black w-10 text-center ${i===0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : i===1 ? 'text-gray-300' : i===2 ? 'text-amber-700' : 'text-slate-600'}`}>#{i+1}</div>
                                            <div className="flex-grow">
                                                <div className="font-bold text-lg text-white">Roscón {r.id + 1}</div>
                                                <div className="text-xs text-slate-400">{r.count} catadores</div>
                                            </div>
                                            <div className="text-3xl font-black text-green-400 bg-slate-800 px-3 py-1 rounded-lg border border-green-500/30">{r.average}</div>
                                        </div>
                                        {/* Comentarios destacados */}
                                        {r.comments.length > 0 && (
                                            <div className="mt-2 pl-14 text-xs italic text-slate-400 border-l-2 border-slate-600 space-y-1">
                                                {r.comments.map((c, idx) => <div key={idx}>"{c}"</div>)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* OUTFIT */}
                        <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-xl p-6 border border-green-500/30 shadow-lg">
                            <h2 className="text-xl font-bold mb-6 text-center text-green-200 flex items-center justify-center gap-2"><Gift /> PREMIO AL ESTILO</h2>
                            <div className="flex flex-wrap gap-3 justify-center">
                                {resultsData.outfits.map(([name, count], i) => (
                                    <div key={name} className={`px-4 py-2 rounded-full flex items-center gap-2 shadow-lg ${i===0 ? 'bg-yellow-500 text-black font-bold transform scale-110' : 'bg-black/30 text-green-100 border border-green-700'}`}>
                                        <span className="capitalize">{name}</span>
                                        <span className="bg-white text-black text-xs rounded-full w-6 h-6 flex items-center justify-center font-black shadow-inner">{count}</span>
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

  // PANTALLA VOTACIÓN (PRINCIPAL)
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-serif pb-32">
        {/* Navbar */}
        <div className="bg-[#8B0000] text-yellow-100 px-4 py-3 shadow-lg sticky top-0 z-20 border-b-4 border-yellow-600 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Crown className="fill-yellow-500 text-yellow-600 w-6 h-6" />
                <span className="font-bold tracking-widest text-sm md:text-base">ROSCONADA '25</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-xs md:text-sm bg-black/20 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1">
                    🐫 {participantName}
                </span>
                <button onClick={() => {setMode('login'); setParticipantName('');}} className="text-xs opacity-60 hover:opacity-100">Salir</button>
            </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 space-y-6">
            <div className="text-center py-4">
                <p className="text-[#8B0000] text-sm italic opacity-80">"Que gane el de nata..."</p>
            </div>

            {/* Lista de Roscones */}
            {scores.map((score, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md border-2 border-[#E5E5E5] overflow-hidden group hover:border-yellow-400 transition-colors">
                    {/* Cabecera del Roscón */}
                    <div className="bg-stone-100 p-3 border-b border-stone-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="bg-[#8B0000] text-white text-xs font-bold px-2 py-1 rounded shadow-sm">#{index + 1}</span>
                            <span className="font-bold text-stone-800">Roscón {index + 1}</span>
                        </div>
                        {score.rating && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />}
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Botones de Voto */}
                        <div className="flex justify-between gap-2">
                            {ratingOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleRating(index, option.value)}
                                    className={`
                                        flex-1 flex flex-col items-center justify-center py-3 rounded-lg border-2 transition-all
                                        ${score.rating === option.value 
                                            ? 'bg-yellow-100 border-yellow-500 shadow-inner transform scale-95' 
                                            : `${option.color} hover:brightness-95`}
                                    `}
                                >
                                    <span className="text-2xl mb-1 filter drop-shadow-sm">{option.emoji}</span>
                                    <span className="text-[10px] font-bold uppercase text-stone-600">{option.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Campo de Comentarios */}
                        <div className="relative">
                            <BookOpen className="absolute top-3 left-3 w-4 h-4 text-stone-400" />
                            <textarea
                                value={score.notes}
                                onChange={(e) => handleNotes(index, e.target.value)}
                                placeholder={`Opinión del Roscón ${index+1}...`}
                                className="w-full h-full min-h-[80px] pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:border-[#8B0000] focus:bg-white outline-none resize-none transition-colors font-sans"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {/* Bonus Track */}
            <div className="bg-gradient-to-r from-green-800 to-emerald-900 rounded-xl p-6 text-white shadow-lg border-2 border-yellow-500/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Gift size={100} /></div>
                <h3 className="font-bold text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                    <Star className="fill-yellow-400" size={16}/> Bonus: Mejor Atuendo
                </h3>
                <div className="relative z-10">
                    <label className="text-xs text-green-200 block mb-1 uppercase font-bold">¿Quién lleva el jersey navideño mas molón de todos?</label>
                    <input 
                        type="text" 
                        value={bestOutfit}
                        onChange={(e) => setBestOutfit(e.target.value)}
                        placeholder="Escribe un nombre..."
                        className="w-full bg-black/20 border border-green-600 rounded-lg p-3 text-white placeholder-green-300/50 focus:border-yellow-400 focus:bg-black/40 outline-none transition-all"
                    />
                </div>
            </div>
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-stone-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-30">
            <div className="max-w-3xl mx-auto flex gap-3">
                <button 
                    onClick={() => saveVotes(true)}
                    className="flex-1 bg-[#8B0000] hover:bg-red-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <Save className="w-5 h-5" /> 
                    <span>GUARDAR / ACTUALIZAR</span>
                </button>
            </div>
            <p className="text-center text-[10px] text-stone-400 mt-2">
                Puedes guardar tantas veces como quieras. Se mantendrá tu última versión.
            </p>
        </div>
    </div>
  );
};

// Renderizado
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


