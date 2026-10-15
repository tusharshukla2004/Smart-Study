import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import { ChatAPI, GroupsAPI, Session } from '../api';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const getSenderId = (sender) => String(sender?._id || sender || '');

const mapMessage = (message, currentUserId) => {
  const sender = message.senderId;
  return {
    id: String(message._id),
    senderId: getSenderId(sender),
    sender: message.senderName || sender?.name || 'Study partner',
    avatar: message.senderAvatar || sender?.avatar || '📚',
    text: message.content,
    createdAt: message.createdAt,
    self: getSenderId(sender) === String(currentUserId)
  };
};

const Chat = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const currentUser = Session.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  const selectedGroup = groups.find(group => group._id === selectedGroupId);

  useEffect(() => {
    let active = true;

    const loadGroups = async () => {
      const response = await GroupsAPI.getAll();
      if (!active) return;
      if (!response.success) {
        setError(response.message || 'Could not load your study groups.');
        setLoadingGroups(false);
        return;
      }

      const memberGroups = (response.groups || []).filter(group =>
        (group.members || []).some(member => getSenderId(member) === String(currentUserId))
      );
      setGroups(memberGroups);
      setSelectedGroupId(memberGroups[0]?._id || '');
      setLoadingGroups(false);
    };

    loadGroups();
    return () => {
      active = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      setJoinedRoom(false);
      setLoadingMessages(false);
      setTypingUser('');
      return undefined;
    }

    let active = true;
    let socket;
    setMessages([]);
    setError('');
    setJoinedRoom(false);
    setTypingUser('');
    setLoadingMessages(true);

    const connectToGroup = async () => {
      const history = await ChatAPI.getHistory(selectedGroupId);
      if (!active) return;
      if (!history.success) {
        setError(history.message || 'Could not load chat history.');
        setLoadingMessages(false);
        return;
      }

      setMessages((history.messages || []).map(message => mapMessage(message, currentUserId)));
      setLoadingMessages(false);

      socket = io(API_URL, {
        auth: { token: Session.getToken() },
        autoConnect: false
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('joinRoom', selectedGroupId, response => {
          if (!active) return;
          if (response?.success) {
            setJoinedRoom(true);
            setError('');
          } else {
            setError(response?.message || 'Could not join this group chat.');
          }
        });
      });

      socket.on('connect_error', connectionError => {
        if (!active) return;
        setConnected(false);
        setJoinedRoom(false);
        setError(connectionError.message || 'Could not connect to chat.');
      });

      socket.on('disconnect', () => {
        if (!active) return;
        setConnected(false);
        setJoinedRoom(false);
      });

      socket.on('newMessage', message => {
        if (!active || String(message.groupId) !== String(selectedGroupId)) return;
        const mapped = mapMessage(message, currentUserId);
        setMessages(previous => previous.some(item => item.id === mapped.id)
          ? previous
          : [...previous, mapped]);
      });

      socket.on('userTyping', event => {
        if (!active || event.userId === String(currentUserId)) return;
        setTypingUser(event.isTyping ? event.name : '');
      });

      socket.connect();
    };

    connectToGroup();

    return () => {
      active = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (socket?.connected) socket.emit('leaveRoom', selectedGroupId);
      socket?.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setConnected(false);
      setJoinedRoom(false);
    };
  }, [selectedGroupId, currentUserId]);

  const handleSend = () => {
    const content = input.trim();
    const socket = socketRef.current;
    if (!content || !socket?.connected || !joinedRoom) return;

    socket.emit('sendMessage', { groupId: selectedGroupId, content }, response => {
      if (!response?.success) {
        setError(response?.message || 'Message could not be sent.');
        return;
      }
      setInput('');
      setError('');
    });
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInput(value);
    if (!socketRef.current?.connected || !joinedRoom) return;

    socketRef.current.emit('typing', { groupId: selectedGroupId, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { groupId: selectedGroupId, isTyping: false });
    }, 800);
  };

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="chat-header" style={{ justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div className="group-emoji">{selectedGroup?.avatar || '📚'}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.1rem' }}>
                  {selectedGroup?.name || 'Study group chat'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {loadingGroups ? 'Loading your groups…' : selectedGroup
                    ? `${selectedGroup.members?.length || 0} members · ${connected && joinedRoom ? 'Connected' : 'Connecting…'}`
                    : 'Join a study group to start chatting'}
                </div>
              </div>
            </div>
            {groups.length > 0 && (
              <select
                className="form-select"
                aria-label="Choose a study group"
                value={selectedGroupId}
                onChange={event => setSelectedGroupId(event.target.value)}
                style={{ maxWidth: '260px' }}
              >
                {groups.map(group => (
                  <option key={group._id} value={group._id}>{group.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="chat-messages">
            {error && <p role="alert" style={{ color: 'var(--danger)', padding: '1rem' }}>{error}</p>}
            {!loadingGroups && groups.length === 0 && (
              <div className="card" style={{ margin: 'auto', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>You need to join a study group before chatting.</p>
                <Link to="/groups" className="btn btn-primary">Browse study groups</Link>
              </div>
            )}
            {loadingMessages && <p style={{ color: 'var(--text-muted)', margin: 'auto' }}>Loading messages…</p>}
            {!loadingMessages && selectedGroup && messages.length === 0 && (
              <p style={{ color: 'var(--text-muted)', margin: 'auto' }}>No messages yet. Start the conversation!</p>
            )}
            {messages.map(message => (
              <div key={message.id} className={`message-row ${message.self ? 'self' : ''}`}>
                <div className="avatar avatar-sm" style={{ alignSelf: 'flex-end' }}>{message.avatar}</div>
                <div>
                  <div className="message-meta">
                    <span className="message-sender">{message.self ? 'You' : message.sender}</span>
                    <span className="message-time">
                      {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="message-bubble">{message.text}</div>
                </div>
              </div>
            ))}
            {typingUser && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{typingUser} is typing…</p>}
          </div>

          <div className="chat-input-bar">
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                placeholder={selectedGroup ? 'Type a message…' : 'Join a group to chat'}
                value={input}
                maxLength={2000}
                disabled={!joinedRoom}
                onChange={handleInputChange}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleSend();
                }}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSend} disabled={!joinedRoom || !input.trim()}>
                Send ✈️
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chat;
