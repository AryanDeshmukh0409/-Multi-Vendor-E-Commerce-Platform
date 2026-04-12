import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchSessions();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await chatAPI.getSessions(token);
      setSessions(res.data.sessions || []);
    } catch (e) { console.error(e); }
  };

  const loadSession = async (id) => {
    try {
      const res = await chatAPI.getSession(id, token);
      setActiveSession(id);
      setMessages(res.data.session.messages || []);
    } catch (e) { console.error(e); }
  };

  const startNewChat = () => {
    setActiveSession(null);
    setMessages([]);
    setInput('');
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await chatAPI.send(
        { message: userMsg, sessionId: activeSession },
        token
      );
      setActiveSession(res.data.sessionId);
      setMessages(res.data.messages || []);
      fetchSessions();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteSession(id, token);
      if (activeSession === id) startNewChat();
      fetchSessions();
    } catch (e) { console.error(e); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <button onClick={startNewChat} style={styles.newChatBtn}>+ New Chat</button>
        <div style={styles.sessionList}>
          {sessions.map(s => (
            <div
              key={s._id}
              onClick={() => loadSession(s._id)}
              style={{
                ...styles.sessionItem,
                ...(activeSession === s._id ? styles.activeSession : {})
              }}
            >
              <span style={styles.sessionTitle}>{s.title}</span>
              <button onClick={(e) => deleteSession(s._id, e)} style={styles.deleteBtn}>×</button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div style={styles.noSessions}>No conversations yet</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={styles.chatArea}>
        <div style={styles.chatHeader}>
          <h2 style={styles.chatTitle}>🤖 Shopping Assistant</h2>
          <span style={styles.chatSubtitle}>Ask about your orders, tracking, payments & more</span>
        </div>

        <div style={styles.messagesArea}>
          {messages.length === 0 && (
            <div style={styles.emptyChat}>
              <div style={styles.emptyChatIcon}>💬</div>
              <h3 style={styles.emptyChatTitle}>How can I help you today?</h3>
              <div style={styles.suggestions}>
                {['Where is my order?', 'Show my orders', 'How much did I spend?', 'Can I cancel my order?'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    style={styles.suggestionBtn}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              ...styles.messageBubble,
              ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble)
            }}>
              <div style={styles.messageRole}>
                {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
              </div>
              <div
                style={styles.messageContent}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
              <div style={styles.messageRole}>🤖 Assistant</div>
              <div style={styles.typing}>
                <span style={styles.dot}>●</span>
                <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
                <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your orders, tracking, payments..."
            style={styles.input}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              ...styles.sendBtn,
              ...(!input.trim() || loading ? styles.sendBtnDisabled : {})
            }}
          >Send</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    height: 'calc(100vh - 64px)',
    background: '#0a0a1a',
    color: '#e0e0e0',
  },
  sidebar: {
    width: '260px',
    background: '#0f0f2a',
    borderRight: '1px solid #1a1a3e',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
  },
  newChatBtn: {
    background: '#e94560',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
  },
  sessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '4px',
    transition: 'background 0.2s',
  },
  activeSession: {
    background: '#1a1a3e',
  },
  sessionTitle: {
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
    marginLeft: '8px',
  },
  noSessions: {
    color: '#666',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '20px',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid #1a1a3e',
    background: '#0f0f2a',
  },
  chatTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#fff',
  },
  chatSubtitle: {
    fontSize: '13px',
    color: '#888',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  emptyChat: {
    textAlign: 'center',
    marginTop: '80px',
  },
  emptyChatIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyChatTitle: {
    color: '#fff',
    marginBottom: '24px',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },
  suggestionBtn: {
    background: '#1a1a3e',
    color: '#e0e0e0',
    border: '1px solid #2a2a4e',
    padding: '10px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background 0.2s',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '12px',
  },
  userBubble: {
    background: '#1a3a5c',
    marginLeft: 'auto',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    background: '#1a1a3e',
    marginRight: 'auto',
    borderBottomLeftRadius: '4px',
  },
  messageRole: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '6px',
    fontWeight: '600',
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: '1.6',
  },
  typing: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
  },
  dot: {
    color: '#888',
    animation: 'pulse 1s infinite',
    fontSize: '10px',
  },
  inputArea: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #1a1a3e',
    background: '#0f0f2a',
  },
  input: {
    flex: 1,
    background: '#1a1a3e',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#e0e0e0',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: '#e94560',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  sendBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};