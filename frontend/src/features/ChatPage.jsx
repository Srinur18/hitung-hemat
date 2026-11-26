
import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../data/chat.js';
import ChatMessageBody from '../ui/ChatMessage.jsx';
import { Header } from '../ui/components.jsx';

const SUGGESTIONS = [
  {
    icon: '📚',
    title: 'Belajar dari dasar',
    description: 'Aku ingin memahami aritmatika sosial.',
    prompt: 'Plum, ajari aku aritmatika sosial dari dasar dengan bahasa sederhana.',
  },
  {
    icon: '🧮',
    title: 'Keuntungan dan kerugian',
    description: 'Bagaimana cara menghitungnya?',
    prompt: 'Plum, jelaskan cara menghitung keuntungan dan kerugian beserta contohnya.',
  },
  {
    icon: '🏷️',
    title: 'Memahami diskon',
    description: 'Aku masih bingung menghitung diskon.',
    prompt: 'Plum, bantu aku memahami cara menghitung diskon dengan contoh sederhana.',
  },
  {
    icon: '💡',
    title: 'Minta bantuan soal',
    description: 'Aku punya soal yang sulit dipahami.',
    prompt: 'Plum, aku ingin belajar cara memahami dan menyelesaikan soal matematika.',
  },
  {
    icon: '💬',
    title: 'Ngobrol bebas',
    description: 'Aku ingin bertanya hal lain.',
    prompt: 'Hai Plum! Aku ingin bertanya dan belajar matematika bersamamu.',
  },
  {
    icon: '🎯',
    title: 'Latihan soal',
    description: 'Berikan aku soal untuk dikerjakan.',
    prompt: 'Plum, berikan aku satu soal latihan aritmatika sosial. Jangan langsung berikan jawabannya, ya.',
  },
];

export default function ChatPage({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (eventOrMessage) => {
    if (typeof eventOrMessage !== 'string') {
      eventOrMessage?.preventDefault();
    }

    const message = (
      typeof eventOrMessage === 'string'
        ? eventOrMessage
        : input
    ).trim();

    if (!message || loading) return;

    const history = messages.map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message },
    ]);

    setInput('');
    setError('');
    setLoading(true);

    try {
      const result = await sendChatMessage(message, history);

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.reply },
      ]);
    } catch (err) {
      setError(err.message || 'Pesan belum berhasil dikirim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen chat-page">
      <Header
        title="Teman Mikir"
        sub="Diskusi matematika bersama Plum"
        onBack={onBack}
      />

      {messages.length === 0 ? (
        <div className="chat-welcome">
          <div className="chat-welcome-icon">🌱</div>

          <h2>Hai, teman belajar!</h2>
          <p>
            Aku Plum, teman belajarmu. Yuk, belajar dan
            diskusi matematika bersama. Mau mulai dari mana?
          </p>

          <div className="chat-suggestion-heading">
            <span>✨</span>
            <strong>Yuk, mulai dengan pertanyaan ini!</strong>
          </div>

          <div className="chat-suggestions">
            {SUGGESTIONS.map((item) => (
              <button
                key={item.title}
                type="button"
                className="chat-suggestion-card"
                onClick={() => handleSend(item.prompt)}
                disabled={loading}
              >
                <span className="chat-suggestion-icon">
                  {item.icon}
                </span>

                <span className="chat-suggestion-content">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>

                <span className="chat-suggestion-arrow">›</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-messages" aria-live="polite">
          {messages.map((item, index) => (
            <div
              key={index}
              className={`chat-message ${
                item.role === 'user' ? 'chat-user' : 'chat-assistant'
              }`}
            >
              <div className="chat-sender">
                {item.role === 'user' ? 'Kamu' : 'Plum'}
              </div>
              <ChatMessageBody content={item.content} />
            </div>
          ))}

          {loading && (
            <div className="chat-message chat-assistant">
              <div className="chat-sender">Plum</div>
              <div className="chat-bubble">
                Plum sedang berpikir...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {error && <p className="chat-error">{error}</p>}

      <form className="chat-input-area" onSubmit={handleSend}>
        <textarea
          className="chat-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pesanmu di sini..."
          rows={2}
          disabled={loading}
          maxLength={2000}
        />

        <button
          className="btn btn-primary chat-send"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Mengirim...' : 'Kirim'}
        </button>
      </form>
    </div>
  );
}
