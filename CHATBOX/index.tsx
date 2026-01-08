
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { io, Socket } from 'socket.io-client';
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
  Globe,
  ShieldCheck
} from 'lucide-react';

// --- Types ---
interface Message {
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

const App: React.FC = () => {
  const [serverUrl, setServerUrl] = useState<string>(localStorage.getItem('chat_server_url') || '');
  const [room, setRoom] = useState<string>('');
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(true);
  
  const [manualUrl, setManualUrl] = useState(localStorage.getItem('manual_app_url') || '');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 현재 접속 주소 감지 (GitHub Pages 등 모든 도메인 허용)
    const currentHref = window.location.href.split('?')[0];
    if (!manualUrl) {
      if (!currentHref.includes('aistudio.google.com')) {
        setManualUrl(currentHref);
        localStorage.setItem('manual_app_url', currentHref);
      } else {
        setIsEditingUrl(true);
      }
    }
  }, []);

  const connectToServer = useCallback(() => {
    const cleanedUrl = serverUrl.trim();
    if (!cleanedUrl) return;

    setIsConnecting(true);
    if (socketRef.current) socketRef.current.disconnect();

    try {
      const fullUrl = cleanedUrl.startsWith('http') ? cleanedUrl : `http://${cleanedUrl}`;
      const socket = io(fullUrl, {
        reconnectionAttempts: 2,
        timeout: 5000,
        transports: ['websocket'],
      });

      socket.on('connect', () => { setIsConnected(true); setIsConnecting(false); });
      socket.on('disconnect', () => { setIsConnected(false); setIsConnecting(false); });
      socket.on('connect_error', () => { setIsConnected(false); setIsConnecting(false); });
      socket.on('message', (data: any) => {
        setMessages(prev => [...prev, {
          sender: data.sender,
          text: data.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: data.sender === username
        }]);
      });
      socketRef.current = socket;
    } catch (err) { setIsConnecting(false); }
  }, [serverUrl, username]);

  useEffect(() => {
    if (serverUrl) connectToServer();
    return () => { socketRef.current?.disconnect(); };
  }, [serverUrl, connectToServer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveUrl = () => {
    localStorage.setItem('manual_app_url', manualUrl);
    setIsEditingUrl(false);
  };

  // --- Fix: Added handleSendMessage function ---
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    if (socketRef.current && isConnected) {
      socketRef.current.emit('message', {
        sender: username,
        room: room,
        text: inputValue.trim()
      });
    } else {
      // Offline fallback: manually add message to list if server is not connected
      const newMessage: Message = {
        sender: username,
        text: inputValue.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true
      };
      setMessages(prev => [...prev, newMessage]);
    }
    setInputValue('');
  };

  const qrUrl = manualUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(manualUrl)}&margin=10&format=png`
    : '';

  if (showSettings) {
    const isBadDomain = manualUrl.includes('aistudio.google.com') || !manualUrl;

    return (
      <div className="flex flex-col items-center justify-start h-screen bg-[#0a0c10] p-6 text-slate-100 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 pt-8 pb-12">
          <div className="text-center">
            <h1 className="text-3xl font-black italic tracking-tighter text-white">READY TO <span className="text-indigo-500">SYNC</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-2">CONFIGURING SESSION</p>
          </div>

          {/* STEP 1: APP URL */}
          <div className={`p-6 rounded-[2rem] border-2 transition-all ${isBadDomain ? 'bg-amber-500/5 border-amber-500/20' : 'bg-green-500/5 border-green-500/10'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isBadDomain ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                  <Globe size={20} />
                </div>
                <span className="font-black text-sm uppercase tracking-widest">1단계: 모바일 접속 주소</span>
              </div>
              <button onClick={() => setIsEditingUrl(!isEditingUrl)} className="text-slate-500 hover:text-white transition-colors">
                <Edit3 size={18} />
              </button>
            </div>

            {isEditingUrl || isBadDomain ? (
              <div className="space-y-4 animate-in">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isBadDomain ? "⚠️ 현재 주소가 개발용 주소이거나 감지되지 않았습니다. 실제 서비스 주소(.github.io 또는 .idx.google.com)를 입력해 주세요." : "수정하려는 서비스 주소를 입력하세요."}
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-indigo-500 text-indigo-400"
                    placeholder="https://yourname.github.io/repo/"
                  />
                  <button onClick={saveUrl} className="bg-indigo-600 px-4 rounded-xl text-white font-bold"><Check size={18}/></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="bg-white p-3 rounded-2xl shadow-2xl">
                  <img src={qrUrl} alt="Connect QR" className="w-48 h-48" />
                </div>
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                    <ShieldCheck size={14} /> 안전한 서비스 주소 감지됨
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(manualUrl); alert('복사완료!'); }} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 py-3 rounded-xl text-[11px] font-bold transition-all active:scale-95">
                      <Copy size={14} /> 복사
                    </button>
                    <button onClick={saveUrl} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 py-3 rounded-xl text-[11px] font-bold transition-all active:scale-95">
                       주소 수정
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SERVER IP */}
          <div className="p-6 rounded-[2rem] border-2 bg-indigo-500/5 border-indigo-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-xl">
                <PcCase size={20} />
              </div>
              <span className="font-black text-sm uppercase tracking-widest">2단계: 데이터 서버 연결</span>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="예: 123.456.7.8:3000"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className={`w-full bg-black/60 border rounded-2xl px-5 py-4 outline-none transition-all font-mono text-sm shadow-inner ${
                    isConnected ? 'border-green-500 text-green-400' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
                {isConnected && <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                Node.js 서버가 실행 중인 PC의 <b>공인 IP</b>를 입력하세요.
              </p>
            </div>
          </div>

          <button 
            onClick={() => setShowSettings(false)}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${
              isConnected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {isConnected ? '채팅방 입장하기' : '서버 연결 없이 계속하기'}
          </button>
        </div>
      </div>
    );
  }

  // --- Login & Chat UI (Logic remain same, UI polished) ---
  if (!isJoined) {
    return (
      <div className="flex flex-col h-screen bg-[#0a0c10] p-8 text-slate-100">
        <header className="flex items-center justify-between mb-12">
          <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase ${isConnected ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
            {isConnected ? 'Server Online' : 'Server Offline'}
          </div>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-800/50 rounded-2xl text-slate-400"><Settings size={20} /></button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full space-y-10">
          <div className="text-center">
            <h1 className="text-6xl font-black italic tracking-tighter">CHAT<span className="text-indigo-500">BOX</span></h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.5em] mt-2">Secure Mobile Session</p>
          </div>
          <div className="w-full space-y-4">
            <input type="text" placeholder="닉네임" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full bg-[#161920] border border-slate-800 rounded-2xl px-6 py-5 focus:border-indigo-500 outline-none transition-all font-bold"/>
            <input type="text" placeholder="방 번호" value={room} onChange={(e)=>setRoom(e.target.value)} className="w-full bg-[#161920] border border-slate-800 rounded-2xl px-6 py-5 focus:border-indigo-500 outline-none transition-all font-bold"/>
            <button onClick={()=>{ if(username&&room) setIsJoined(true); }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Join Room</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10] text-slate-100">
      <header className="flex items-center justify-between px-6 py-5 bg-[#161920] border-b border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsJoined(false)} className="p-2 bg-black/40 rounded-xl text-slate-500"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="font-black text-base uppercase">#{room}</h2>
            <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Connected</p>
          </div>
        </div>
        <div className="bg-indigo-600/10 px-4 py-2 rounded-xl border border-indigo-500/20 text-[11px] font-black text-indigo-400 uppercase">{username}</div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide pb-24">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
            {!msg.isMe && <span className="text-[10px] font-black text-slate-600 uppercase mb-1 ml-2">{msg.sender}</span>}
            <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm ${msg.isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#161920] border border-slate-800 rounded-tl-none'}`}>{msg.text}</div>
            <span className="text-[8px] text-slate-700 font-bold mt-1 mx-2">{msg.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0c10]">
        <div className="max-w-3xl mx-auto flex gap-2 bg-[#161920] border border-slate-800 rounded-2xl p-2 shadow-2xl">
          <input type="text" value={inputValue} onChange={(e)=>setInputValue(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&handleSendMessage()} placeholder="메시지 입력..." className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 text-sm"/>
          <button onClick={handleSendMessage} className="p-4 bg-indigo-600 text-white rounded-xl active:scale-90 transition-all"><Send size={20}/></button>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
