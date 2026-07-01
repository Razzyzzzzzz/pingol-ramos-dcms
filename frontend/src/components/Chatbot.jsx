import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { chatbotApi } from '../services/endpoints';
import logo from '../assets/logo.png';

const GREETING = {
  from: 'bot',
  text: "Hi! I'm the Pingol Ramos assistant. Ask me how to book appointments, manage patients, check inventory, or find any feature.",
  suggestions: [
    'How do I book an appointment?',
    'What are the clinic hours?',
    'How do I upload an x-ray?',
  ],
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setMessages((m) => [...m, { from: 'user', text: message }]);
    setSending(true);
    try {
      const res = await chatbotApi.send(message);
      setMessages((m) => [
        ...m,
        { from: 'bot', text: res.data.reply, suggestions: res.data.suggestions || [] },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'Sorry, I could not reach the assistant just now. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[80] grid h-14 w-14 place-items-center rounded-full bg-navy-700 text-white shadow-pop transition hover:bg-navy-800 hover:scale-105 no-print"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[80] flex h-[32rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop animate-scale-in no-print">
          {/* Header */}
          <div className="flex items-center gap-3 bg-navy-700 px-4 py-3.5 text-white">
            <img src={logo} alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-0.5" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Clinic Assistant</p>
              <p className="flex items-center gap-1 text-[11px] text-lime-300">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> Online
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="scroll-slim flex-1 space-y-3 overflow-y-auto bg-canvas px-3.5 py-4">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.from === 'bot' && (
                    <span className="mr-2 mt-0.5 grid h-7 w-7 shrink-0 place-items-center self-end rounded-full bg-navy-700 text-white">
                      <Bot size={15} />
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.from === 'user'
                        ? 'rounded-br-sm bg-navy-700 text-white'
                        : 'rounded-bl-sm bg-white text-ink shadow-card'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>

                {/* Suggestion chips under bot messages */}
                {m.suggestions?.length > 0 && (
                  <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-navy-200 bg-white px-2.5 py-1 text-xs font-medium text-navy-700 transition hover:bg-navy-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 pl-9 text-xs text-muted">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-400" />
                </span>
                typing…
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-line bg-white px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="input-base h-9"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-700 text-white transition hover:bg-navy-800 disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
