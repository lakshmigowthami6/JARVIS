import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { evaluate } from 'mathjs'
import { createAgent, tool } from 'langchain'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { z } from 'zod'

const port = Number(process.env.AGENT_PORT ?? 8787)
const apiKey = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY

const app = express()
app.use(cors({ origin: ['http://127.0.0.1:5173', 'http://localhost:5173'] }))
app.use(express.json({ limit: '1mb' }))

const calculatorTool = tool(
  async ({ expression }) => {
    const result = evaluate(expression)
    return String(result)
  },
  {
    name: 'calculator',
    description:
      'Evaluate arithmetic expressions. Use for math, conversions, percentages, and numeric comparisons.',
    schema: z.object({
      expression: z
        .string()
        .describe('A math expression such as "12.5 * 4" or "(18 / 3) + 7".'),
    }),
  },
)

const currentTimeTool = tool(
  async ({ timeZone }) => {
    const zone = timeZone || 'Asia/Kolkata'
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: zone,
    }).format(new Date())
  },
  {
    name: 'current_time',
    description:
      'Get the current date and time for a requested IANA time zone. Defaults to Asia/Kolkata.',
    schema: z.object({
      timeZone: z
        .string()
        .optional()
        .describe('An IANA time zone, for example "Asia/Kolkata" or "America/New_York".'),
    }),
  },
)

const wikipediaTool = tool(
  async ({ query }) => {
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php')
    searchUrl.search = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      format: 'json',
      origin: '*',
    }).toString()

    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) {
      throw new Error('Wikipedia search failed.')
    }

    const searchData = await searchResponse.json()
    const title = searchData.query?.search?.[0]?.title
    if (!title) {
      return `No Wikipedia result found for "${query}".`
    }

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const summaryResponse = await fetch(summaryUrl)
    if (!summaryResponse.ok) {
      throw new Error('Wikipedia summary failed.')
    }

    const summaryData = await summaryResponse.json()
    const extract = summaryData.extract || 'No summary available.'
    const pageUrl = summaryData.content_urls?.desktop?.page

    return pageUrl ? `${extract}\nSource: ${pageUrl}` : extract
  },
  {
    name: 'wikipedia_lookup',
    description:
      'Look up a concise Wikipedia summary for general knowledge, people, places, technologies, and historical topics.',
    schema: z.object({
      query: z.string().describe('The topic to search on Wikipedia.'),
    }),
  },
)

function buildAgent() {
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY or VITE_GEMINI_API_KEY in .env.')
  }

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey,
    temperature: 0.3,
  })

  return createAgent({
    model,
    tools: [calculatorTool, currentTimeTool, wikipediaTool],
    prompt:
      'Your name is JARVIS. You may also recognize the stylized spelling J.A.R.V.I.S, but when asked your name, say that you are JARVIS. You are a concise, practical AI agent. Use tools when they help with math, current time, or factual lookup. Do not mention internal tool calls unless useful to the user.',
  })
}

const agent = buildAgent()

function toAgentMessages(messages = []) {
  return messages
    .filter((message) => message?.text)
    .map((message) => ({
      role: message.role === 'model' ? 'assistant' : 'user',
      content: message.text,
    }))
}

function contentToText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part?.type === 'text') return part.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return String(content ?? '')
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    name: 'JARVIS',
    model: 'gemini-2.5-flash',
    tools: ['calculator', 'current_time', 'wikipedia_lookup'],
  })
})

app.post('/api/chat', async (request, response) => {
  try {
    const messages = toAgentMessages(request.body?.messages)
    if (messages.length === 0) {
      response.status(400).json({ error: 'No message provided.' })
      return
    }

    const result = await agent.invoke({ messages })
    const finalMessage = result.messages?.at(-1)

    response.json({
      text: contentToText(finalMessage?.content),
      tools: ['calculator', 'current_time', 'wikipedia_lookup'],
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Agent failed.',
    })
  }
})

app.listen(port, () => {
  console.log(`JARVIS agent server listening on http://127.0.0.1:${port}`)
})
