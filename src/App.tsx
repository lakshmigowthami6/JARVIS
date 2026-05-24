import { FormEvent, useMemo, useState } from 'react'
import { askGemini, type ChatMessage } from './gemini'

function createMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
  }
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const canSend = prompt.trim().length > 0 && !isSending

  const statusText = useMemo(() => {
    if (error) return error
    if (isSending) return 'J.A.R.V.I.S is thinking...'
    return import.meta.env.VITE_GEMINI_API_KEY
      ? ''
      : 'Add VITE_GEMINI_API_KEY to .env to enable Gemini responses.'
  }, [error, isSending])

  function speak(text: string) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find((voice) => voice.lang.startsWith('en') && voice.name.includes('Google')) ??
      voices.find((voice) => voice.lang.startsWith('en')) ??
      null

    utterance.voice = preferredVoice
    utterance.rate = 0.92
    utterance.pitch = 0.82
    utterance.volume = 1

    window.speechSynthesis.speak(utterance)
  }

  function toggleVoice() {
    setVoiceEnabled((enabled) => {
      if (enabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }

      return !enabled
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = prompt.trim()
    if (!text || isSending) return

    const userMessage = createMessage('user', text)
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setPrompt('')
    setError('')
    setIsSending(true)

    try {
      const answer = await askGemini(nextMessages)
      setMessages((current) => [...current, createMessage('model', answer)])
      speak(answer)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Gemini could not answer right now.'
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="chat-app">
      <div className="wallpaper" aria-hidden="true" />
      <div className="shade" aria-hidden="true" />

      <section className="hero-chat" aria-label="Jarvis chat">
        <div className="message-list" aria-live="polite">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <span>{message.role === 'user' ? 'You' : 'J.A.R.V.I.S'}</span>
              <p>{message.text}</p>
            </article>
          ))}
          {isSending && (
            <article className="message model is-loading">
              <span>J.A.R.V.I.S</span>
              <p>Thinking...</p>
            </article>
          )}
        </div>

        <form className="prompt-box" onSubmit={handleSubmit}>
          <button
            className={`voice-button ${voiceEnabled ? 'is-on' : ''}`}
            type="button"
            aria-label={voiceEnabled ? 'Mute spoken responses' : 'Speak responses'}
            title={voiceEnabled ? 'Mute spoken responses' : 'Speak responses'}
            onClick={toggleVoice}
          >
            {voiceEnabled ? 'Voice' : 'Mute'}
          </button>
          <label className="sr-only" htmlFor="prompt">
            Ask Jarvis
          </label>
          <input
            id="prompt"
            type="text"
            placeholder="Ask J.A.R.V.I.S"
            autoComplete="off"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={isSending}
          />
          <button className="mic-button" type="submit" aria-label="Send message" disabled={!canSend}>
            {isSending ? '...' : '>'}
          </button>
        </form>

        {statusText && <p className="chat-status">{statusText}</p>}
      </section>
    </main>
  )
}

export default App
