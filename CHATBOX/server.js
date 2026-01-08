import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

// 브라우저로 직접 접속했을 때 안내 페이지를 보여줍니다.
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f1115; color: white; height: 100vh;">
      <h1 style="color: #6366f1;">🚀 채팅 서버가 작동 중입니다!</h1>
      <p>이 주소는 채팅 데이터 전송용 서버 주소입니다.</p>
      <div style="background: #1a1d23; padding: 20px; border-radius: 15px; display: inline-block; margin-top: 20px; border: 1px solid #334155;">
        <p style="margin: 0; color: #94a3b8;">모바일에서 대화하려면?</p>
        <ol style="text-align: left; color: #cbd5e1; line-height: 1.8;">
          <li>원래의 <b>웹앱 URL</b>로 접속하세요.</li>
          <li>우측 상단 <b>설정(⚙️)</b> 버튼을 누르세요.</li>
          <li>서버 주소 칸에 현재 이 주소(IP:3000)를 입력하세요.</li>
        </ol>
      </div>
    </div>
  `);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log('연결됨:', socket.id);
  socket.on('join', (data) => socket.join(data.room));
  socket.on('message', (data) => {
    socket.to(data.room).emit('message', data);
  });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`서버 실행 중: 포트 ${PORT}`);
});