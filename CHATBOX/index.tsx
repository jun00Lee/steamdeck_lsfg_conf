
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
  ShieldCheck,
  ExternalLink,
  Info,
  Terminal,
  ChevronDown,
  RefreshCcw,
  Zap
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
  const [room, setRoom] = useState<string>(localStorage.getItem('chat_room') || '1234');
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [lastError, setLastError] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(true);
  const [useHttps, setUseHttps] = useState(false);
  
  const [manualUrl, setManualUrl] = useState(localStorage.getItem('manual_app_url') || '');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    setConnectionStatus('connecting');
    setLastError('');
    if (socketRef.current) socketRef.current.disconnect();

    try {
      const protocol = useHttps ? 'https://' : 'http://';
      const fullUrl = cleanedUrl.startsWith('http') ? cleanedUrl : `${protocol}${cleanedUrl}`;
      
      const socket = io(fullUrl, {
        reconnectionAttempts: 2,
        timeout: 5000,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => { 
        setIsConnected(true); 
        setConnectionStatus('connected');
        localStorage.setItem('chat_server_url', cleanedUrl);
        // 서버 연결 시 현재 방에 입장 알림
        if (isJoined) socket.emit('join', room);
      });

      socket.on('disconnect', () => { 
        setIsConnected(false); 
        setConnectionStatus('idle');
      });

      socket.on('connect_error', (err) => { 
        console.error('Socket Error:', err);
        setLastError(err.message || '연결 시간 초과 (Security/Network)');
        setIsConnected(false); 
        setConnectionStatus('error');
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
    } catch (err: any) { 
      setLastError(err.message);
      setConnectionStatus('error');
    }
  }, [serverUrl, username, isJoined, room, useHttps]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveUrl = () => {
    localStorage.setItem('manual_app_url', manualUrl);
    setIsEditingUrl(false);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    if (socketRef.current && isConnected) {
      socketRef.current.emit('message', {
        sender: username,
        room: room,
        text: inputValue.trim()
      });
    } else {
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
        <div className="w-full max-w-md space-y-6 pt-6 pb-12">
          <div className="text-center">
            <h1 className="text-3xl font-black italic tracking-tighter text-white">SYNC <span className="text-indigo-500">CONTROL</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-2 uppercase">Connectivity Management</p>
          </div>

          {/* STEP 1: MOBILE ENTRY POINT */}
          <div className="p-6 rounded-[2rem] border-2 bg-slate-900/40 border-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-xl">
                  <QrCode size={20} />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">1. 모바일 접속용 QR</span>
              </div>
              <button onClick={() => setIsEditingUrl(!isEditingUrl)} className="text-slate-500 hover:text-white transition-colors">
                <Edit3 size={18} />
              </button>
            </div>

            {isEditingUrl || isBadDomain ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase">현재 페이지의 실제 서비스 주소 입력</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono text-indigo-400 outline-none focus:border-indigo-500"
                    placeholder="https://user.github.io/app"
                  />
                  <button onClick={saveUrl} className="bg-indigo-600 px-4 rounded-xl text-white font-bold"><Check size={18}/></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-2 rounded-2xl shadow-2xl overflow-hidden">
                  <img src={qrUrl} alt="Connect QR" className="w-40 h-40" />
                </div>
                <div className="w-full flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(manualUrl); alert('복사되었습니다.'); }} className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-2 transition-all">
                    <Copy size={14} /> URL 복사
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SERVER CONFIGURATION */}
          <div className={`p-6 rounded-[2rem] border-2 transition-all duration-500 ${
            connectionStatus === 'connected' ? 'bg-green-500/5 border-green-500/30' : 
            connectionStatus === 'error' ? 'bg-red-500/5 border-red-500/30' : 'bg-indigo-500/5 border-indigo-500/10'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-500' : 'bg-indigo-500/20 text-indigo-500'}`}>
                  <Zap size={20} />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">2. 데이터 서버 설정</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-500">HTTPS?</span>
                <button 
                  onClick={() => setUseHttps(!useHttps)}
                  className={`w-10 h-5 rounded-full relative transition-all ${useHttps ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useHttps ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">서버 IP 및 포트</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="예: 192.168.0.10:3000"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className={`w-full bg-black/60 border rounded-2xl px-5 py-4 outline-none transition-all font-mono text-sm ${
                      connectionStatus === 'connected' ? 'border-green-500 text-green-400' : 
                      connectionStatus === 'error' ? 'border-red-500 text-red-400' : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  <button 
                    onClick={connectToServer}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl text-white transition-all active:scale-90 disabled:opacity-50"
                    disabled={connectionStatus === 'connecting' || !serverUrl}
                  >
                    {connectionStatus === 'connecting' ? <RefreshCcw size={18} className="animate-spin" /> : <Wifi size={18} />}
                  </button>
                </div>
              </div>

              {connectionStatus === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-red-500 font-black text-xs uppercase">
                    <AlertCircle size={16} /> 연결 실패 리포트
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg font-mono text-[9px] text-red-300 break-all border border-red-500/10">
                    ERROR: {lastError || 'Unknown Network Error'}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-white font-bold underline">해결 방법:</p>
                    <ul className="text-[10px] text-slate-400 space-y-1.5 list-none">
                      <li className="flex gap-2 items-start"><span className="text-red-500 font-black">1.</span> 주소창 왼쪽 [자물쇠] -> [사이트 설정] -> [안전하지 않은 콘텐츠] -> <b>허용</b> 으로 변경</li>
                      <li className="flex gap-2 items-start"><span className="text-red-500 font-black">2.</span> 서버 PC와 모바일이 <b>같은 와이파이</b>에 연결되었는지 확인</li>
                      <li className="flex gap-2 items-start"><span className="text-red-500 font-black">3.</span> 서버의 CORS 설정에서 GitHub 주소 허용 여부 확인</li>
                    </ul>
                  </div>
                </div>
              )}

              {connectionStatus === 'connected' && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 animate-in slide-in-from-bottom-2">
                  <ShieldCheck size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">데이터 링크 동기화 완료</span>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => {
              localStorage.setItem('chat_room', room);
              localStorage.setItem('chat_username', username);
              setShowSettings(false);
            }}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl ${
              connectionStatus === 'connected' ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {connectionStatus === 'connected' ? '메인 화면으로 이동' : '오프라인 모드로 계속하기'}
          </button>
        </div>
      </div>
    );
  }

  // --- Login & Chat UI (UI polished) ---
  if (!isJoined) {
    return (
      <div className="flex flex-col h-screen bg-[#0a0c10] p-8 text-slate-100">
        <header className="flex items-center justify-between mb-12">
          <div className={`px-4 py-2 rounded-full border text-[9px] font-black tracking-[0.2em] uppercase flex items-center gap-2 ${isConnected ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            {isConnected ? 'Sync Online' : 'Sync Offline'}
          </div>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-800/50 rounded-2xl text-slate-400 hover:text-white transition-colors"><Settings size={20} /></button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full space-y-12">
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-black italic tracking-tighter leading-none">CHAT<br/><span className="text-indigo-500">VAULT</span></h1>
            <p className="text-[9px] font-black text-slate-700 tracking-[0.5em] uppercase">Private Encryption Node</p>
          </div>
          <div className="w-full space-y-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-600 uppercase ml-3">Operator ID</label>
              <input type="text" placeholder="GUEST_USER" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full bg-[#161920] border border-slate-800 rounded-2xl px-6 py-4 focus:border-indigo-500 outline-none transition-all font-bold tracking-wider"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-600 uppercase ml-3">Channel Code</label>
              <input type="text" placeholder="0000" value={room} onChange={(e)=>setRoom(e.target.value)} className="w-full bg-[#161920] border border-slate-800 rounded-2xl px-6 py-4 focus:border-indigo-500 outline-none transition-all font-bold tracking-wider font-mono"/>
            </div>
            <button 
              onClick={()=>{ if(username&&room) {
                setIsJoined(true);
                if(socketRef.current && isConnected) socketRef.current.emit('join', room);
              }}} 
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Access Channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10] text-slate-100 font-sans">
      <header className="flex items-center justify-between px-6 py-4 bg-[#11141b] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsJoined(false)} className="p-2 bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-colors"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="font-black text-xs uppercase tracking-[0.2em] text-slate-300">Channel #{room}</h2>
            <div className="flex items-center gap-1.5">
               <span className={`w-1 h-1 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
               <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">{isConnected ? 'Encrypted Link' : 'Offline Buffer'}</p>
            </div>
          </div>
        </div>
        <div className="bg-indigo-600/10 px-4 py-1.5 rounded-xl border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">{username}</div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-4 opacity-40">
            <div className="p-6 rounded-full bg-slate-900 border border-slate-800">
              <MessageCircle size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Channel initialized. awaiting data...</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
            {!msg.isMe && <span className="text-[8px] font-black text-slate-600 uppercase mb-2 ml-1 tracking-widest">{msg.sender}</span>}
            <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed shadow-lg transition-all ${
              msg.isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#161920] border border-slate-800/50 rounded-tl-none text-slate-200'
            }`}>
              {msg.text}
            </div>
            <span className="text-[7px] text-slate-800 font-black mt-2 mx-1 tracking-tighter">{msg.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <div className="p-4 bg-[#0a0c10] border-t border-slate-900/50">
        <div className="max-w-3xl mx-auto flex gap-2 bg-[#161920] border border-slate-800/50 rounded-2xl p-2 shadow-2xl focus-within:border-indigo-500/50 transition-all">
          <input 
            type="text" 
            value={inputValue} 
            onChange={(e)=>setInputValue(e.target.value)} 
            onKeyDown={(e)=>e.key==='Enter'&&handleSendMessage()} 
            placeholder="Secure transmission..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 text-xs font-medium outline-none placeholder:text-slate-700"
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim()}
            className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-20 active:scale-90 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Send size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
