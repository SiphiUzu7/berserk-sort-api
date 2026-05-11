require('dotenv').config()
const express = require('express')
const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000
const GROQ_API_KEY = process.env.GROQ_API_KEY

app.get('/health', (req, res) => {
  res.json({ status: 'alive', project: 'berserk-sort' })
})

app.post('/sort', async (req, res) => {
  console.log('RAW BODY:', req.body)
  const { answers } = req.body

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a sorting oracle for the world of Berserk by Kentaro Miura.
Sort the user into exactly one of these roles:
The Struggler | The Dreamer | The Devoted | The Watcher | The Apostle | The Anchor
Return ONLY valid JSON — no preamble, no markdown, no explanation:
{"role":"...","tagline":"...","characters":["...","..."],"reasoning":"2-3 sentences in Berserk tone"}`
        },
        {
          role: 'user',
          content: `My answers: ${JSON.stringify(answers)}`
        }
      ]
    })
  })

  const data = await response.json()
  console.log('GROQ RESPONSE:', JSON.stringify(data, null, 2))
  const text = data.choices[0].message.content
  const result = JSON.parse(text)
  res.json(result)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})