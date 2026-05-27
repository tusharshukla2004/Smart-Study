import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

const INITIAL_MESSAGES = [
  { sender: 'Sarah K.', avatar: 'SK', text: "Hey everyone! Ready for today's session?", time: '5:00 PM', self: false },
  { sender: 'You', avatar: 'AJ', text: "Absolutely! I've been working on the dynamic programming problems.", time: '5:01 PM', self: true },
  { sender: 'Mike R.', avatar: 'MR', text: 'Same here. The knapsack problem was tricky 😅', time: '5:02 PM', self: false },
  { sender: 'Sarah K.', avatar: 'SK', text: "Let's start with a recap of last session before diving in.", time: '5:03 PM', self: false },
  { sender: 'You', avatar: 'AJ', text: 'Great idea! Should we use the shared whiteboard?', time: '5:04 PM', self: true },
  { sender: 'Priya M.', avatar: 'PM', text: "Yes! I'll share my screen for the diagrams.", time: '5:05 PM', self: false },
];

const Chat = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'You', avatar: 'AJ', text: input, time, self: true }]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Chat Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="group-emoji">⚙️</div>
              <div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.1rem' }}>
                  Advanced Algorithms Study Group
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  8 members · 3 online
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message-row ${m.self ? 'self' : ''}`}>
                <div className="avatar avatar-sm" style={{ alignSelf: 'flex-end' }}>{m.avatar}</div>
                <div>
                  <div className="message-meta">
                    <span className="message-sender">{m.sender}</span>
                    <span className="message-time">{m.time}</span>
                  </div>
                  <div className="message-bubble">{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Bar */}
          <div className="chat-input-bar">
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={sendMessage}>Send ✈️</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chat;
