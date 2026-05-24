export type ChatMessage = {
  id: string
  role: 'user' | 'model'
  text: string
}

export async function askGemini(messages: ChatMessage[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  const data = (await response.json()) as { text?: string; error?: string }

  if (!response.ok) {
    throw new Error(data.error ?? 'Agent could not answer right now.')
  }

  return data.text ?? 'I did not receive a text response.'
}
