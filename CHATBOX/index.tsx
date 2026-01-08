
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
// @ts-ignore - socket.io-client는 브라우저에서 직접 로드하거나 esm.sh를 사용합니다.
import { io, Socket } from 'https://esm.sh/socket.io-client@4.7.4';
import { 
  Send, 
  Settings, 
  User, 
  ArrowLeft,
  MessageCircle,
  Hash,
  AlertCircle,
  Wifi,
  Copy,
  Smartphone,
  PcCase,
  QrCode,
  Edit3,
  Check,
  Share2,
  ExternalLink
} from 'lucide-react';

// --- Types ---
interface Message {
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

const App: React.FC = () => {
  // --- States ---
  const [serverUrl, setServerUrl] = useState<string>(localStorage.getItem('chat_server_url') || '');
  const [room, setRoom] = useState<string>('');
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(true); // 처음엔 설정을 무조건 보여줌
  
  // 앱 주소 관련 상태
  const [manualUrl, setManualUrl] = useState(localStorage.getItem('manual_app_url') || '');
  const [isEditingUrl, setIsEditingUrl] = useState(!localStorage.getItem('manual_app_url'));
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 현재 접속 주소 감지 시도
    const currentHref = window.location.href.split('?')[0];
    if (!manualUrl) {
      // aistudio가 포함되어 있으면 비워두고 수동입력 유도
      if (currentHref.includes('aistudio.google.com')) {
        setManualUrl('');
        setIsEditingUrl(true);
      } else {
        setManualUrl(currentHref);
        localStorage.setItem('manual_app_url', currentHref);
      }
    }
  }, []);

  // --- Socket Logic ---
  const connectToServer = useCallback(() => {
    const cleanedUrl = serverUrl.trim();
    if (!cleanedUrl) return;

    setIsConnecting(true);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    try {
      const fullUrl = cleanedUrl.startsWith('http') ? cleanedUrl : `http://${cleanedUrl}`;
      const socket = io(fullUrl, {
        reconnectionAttempts: 2,
        timeout: 5000,
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        setIsConnecting(false);
      });

      socket.on('connect_error', () => {
        setIsConnected(false);
        setIsConnecting(false);
      });

      socket.on('message', (data: any) => {
        setMessages(prev => [...prev, {
          sender: data.sender,
          text: data.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: data.sender === username
        }]);
      });

      socketRef.current = socket;
    } catch (err) {
      setIsConnecting(false);
    }
  }, [serverUrl, username]);

  useEffect(() => {
    if (serverUrl) connectToServer();
    return () => { socketRef.current?.disconnect(); };
  }, [serverUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers ---
  const handleJoinRoom = () => {
    if (!username || !room || !isConnected) return;
    socketRef.current?.emit('join', { username, room });
    localStorage.setItem('chat_username', username);
    setIsJoined(true);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !isJoined) return;
    socketRef.current?.emit('message', { room, sender: username, text: inputValue.trim() });
    setMessages(prev => [...prev, {
      sender: username,
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    }]);
    setInputValue('');
  };

  const saveUrl = () => {
    localStorage.setItem('manual_app_url', manualUrl);
    setIsEditingUrl(false);
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(manualUrl);
    alert('주소가 복사되었습니다. 휴대폰에 전달하세요!');
  };

  const shareAppUrl = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Private Chat', url: manualUrl });
      } catch (err) { console.log(err); }
    } else {
      copyAppUrl();
    }
  };

  // QR 코드 생성 (고대비 버전)
  const qrUrl = manualUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(manualUrl)}&margin=10&format=png`
    : '';

  if (showSettings) {
    const isBadDomain = manualUrl.includes('aistudio.google.com');

    return (
      <div className="flex flex-col items-center justify-start h-screen bg-[#0a0c10] p-6 text-slate-100 overflow-y-auto pb-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center py-6">
            <h1 className="text-3xl font-black italic tracking-tighter">CONNECTION <span className="text-indigo-500">GUIDE</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-1">MOBILE SYNC INITIALIZATION</p>
          </div>

          {/* STEP 1: MOBILE APP URL */}
          <div className={`p-6 rounded-[2rem] border-2 transition-all ${isBadDomain || !manualUrl ? 'bg-red-500/5 border-red-500/20' : 'bg-indigo-500/5 border-indigo-500/10'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isBadDomain || !manualUrl ? 'bg-red-500/20 text-red-500' : 'bg-indigo-500/20 text-indigo-500'}`}>
                  <Smartphone size={20} />
                </div>
                <span className="font-black text-sm uppercase tracking-widest">1단계: 모바일 접속</span>
              </div>
              <button onClick={() => setIsEditingUrl(!isEditingUrl)} className="text-slate-500 hover:text-white transition-colors">
                <Edit3 size={18} />
              </button>
            </div>

            {isEditingUrl ? (
              <div className="space-y-4 animate-in">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                  <p className="text-[11px] text-amber-500 leading-relaxed">
                    <b>중요:</b> 주소창의 <code>aistudio.google.com</code>은 에디터용이라 모바일에서 열리지 않습니다! <br/><br/>
                    우측 하단 <b>[Preview]</b> 창 위에 있는 실제 주소(<code>.idx.google.com</code>으로 끝나는 것)를 복사해 여기에 넣으세요.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-indigo-500"
                    placeholder="https://...idx.google.com/"
                  />
                  <button onClick={saveUrl} className="bg-indigo-600 px-4 rounded-xl text-white font-bold">확인</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="bg-white p-4 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.2)] group relative overflow-hidden">
                  {qrUrl ? (
                    <img src={qrUrl} alt="Connect QR" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-300">주소를 입력해주세요</div>
                  )}
                </div>
                
                <div className="flex flex-col items-center gap-2 w-full">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">QR 코드를 카메라로 스캔하세요</p>
                  <div className="flex gap-2 w-full">
                    <button onClick={shareAppUrl} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition-all">
                      <Share2 size={14} /> 공유하기
                    </button>
                    <button onClick={copyAppUrl} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition-all">
                      <Copy size={14} /> 복사하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SERVER IP */}
          <div className="p-6 rounded-[2rem] border-2 bg-amber-500/5 border-amber-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl">
                <PcCase size={20} />
              </div>
              <span className="font-black text-sm uppercase tracking-widest">2단계: PC 서버 주소</span>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="예: 공인IP:3000"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className={`w-full bg-black/60 border rounded-2xl px-5 py-4 outline-none transition-all font-mono text-sm shadow-inner ${
                    isConnected ? 'border-green-500/50 text-green-400' : 'border-slate-800 focus:border-indigo-500 text-indigo-400'
                  }`}
                />
                {isConnected && <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />}
              </div>
              <p className="text-[10px] text-slate-500 pl-1 leading-relaxed">
                * PC 터미널(Node.js)에 표시된 공인 IP와 포트번호를 입력하세요.
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              if(!manualUrl || isBadDomain) { alert('정확한 앱 주소를 입력해주세요!'); return; }
              localStorage.setItem('chat_server_url', serverUrl);
              setShowSettings(false);
            }} 
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${
              isConnected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {isConnected ? '채팅창으로 이동' : '서버 연결 대기 중...'}
          </button>
        </div>
      </div>
    );
  }

  // --- Main Chat UI (Previous Version) ---
  if (!isJoined) {
    return (
      <div className="flex flex-col h-screen bg-[#0a0c10] p-6 text-slate-100">
        <header className="flex items-center justify-between mb-8">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${
            isConnected ? 'bg-green-500/5 border-green-500/20 text-green-500' : 'bg-red-500/5 border-red-500/20 text-red-500'
          }`}>
            <Wifi size={14} className={isConnected ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-black tracking-widest uppercase">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-800/50 border border-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-all">
            <Settings size={20} />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto space-y-12">
          <div className="text-center">
            <h1 className="text-6xl font-black italic tracking-tighter text-white">CHAT<span className="text-indigo-500">BOX</span></h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em] mt-2 text-center">Encrypted Mobile Session</p>
          </div>

          <div className="w-full space-y-6 animate-in">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-600 uppercase ml-2 tracking-widest">My Nickname</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="이름"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#161920] border border-slate-800 rounded-2xl pl-12 pr-4 py-5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-800 font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-600 uppercase ml-2 tracking-widest">Room Name</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="방 이름 (예: 1234)"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full bg-[#161920] border border-slate-800 rounded-2xl pl-12 pr-4 py-5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-800 font-bold"
                />
              </div>
            </div>
            <button 
              onClick={handleJoinRoom}
              disabled={!username || !room || !isConnected}
              className="w-full py-5 rounded-2xl font-black text-lg bg-indigo-600 text-white shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale uppercase"
            >
              Enter Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10] text-slate-100 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-5 bg-[#161920] border-b border-slate-800 shrink-0 z-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsJoined(false)} className="p-2 bg-black/40 rounded-xl text-slate-500 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-base leading-tight tracking-tight uppercase">#{room}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Secure Room</span>
            </div>
          </div>
        </div>
        <div className="bg-indigo-600/10 px-4 py-2 rounded-xl border border-indigo-500/20 flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full" />
          <span className="text-[11px] font-black text-indigo-400 uppercase">{username}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide pb-32">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-12 opacity-20">
            <MessageCircle size={64} className="mb-4 text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-in`}>
            {!msg.isMe && <span className="text-[10px] font-black text-slate-600 uppercase ml-2 mb-1">{msg.sender}</span>}
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-xl ${
              msg.isMe ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-900/20' : 'bg-[#161920] border border-slate-800 text-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
            <span className="text-[8px] text-slate-700 font-bold mt-1.5 mx-2 uppercase">{msg.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10] to-transparent">
        <div className="max-w-3xl mx-auto flex items-center gap-2 bg-[#161920] border border-slate-800 rounded-2xl p-2 shadow-2xl focus-within:border-indigo-500/50 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-800 py-4 px-4 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-20 active:scale-90 transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-in { animation: msgIn 0.3s ease-out forwards; }
        @keyframes msgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
