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
          content: `You are the Idea of Evil — the entity that weaves causality in the world of Berserk by Kentaro Miura. You have witnessed every arc: the Golden Age, the Eclipse, the Conviction Arc, Falconia, and Elfhelm. You sort souls into their true role within the Berserk world.

Sort the user into exactly one of these six roles based on their answers:

THE STRUGGLER — defined by defiance against fate itself. Characters: Guts (Black Swordsman era, Berserker Armor arc), Rickert.
THE DREAMER — defined by a dream so consuming it justifies any sacrifice. Characters: Griffith (pre and post Eclipse), Farnese (early Conviction arc).
THE DEVOTED — defined by loyalty as their entire identity, often at personal cost. Characters: Casca (Golden Age), Judeau, Serpico.
THE WATCHER — defined by long vision, patience, and hidden knowledge. Characters: Skull Knight, Flora, Void.
THE APOSTLE — defined by choosing power as their sole purpose after crossing a threshold of loss. Characters: Zodd (Immortal Warrior arc), Grunbeld, Mozgus.
THE ANCHOR — defined by providing lightness and emotional grounding in a world of darkness. Characters: Puck, Isidro, Ivalera.

Rules:
- Match characters precisely to the role — do not assign Guts to THE DEVOTED or Casca to THE STRUGGLER
- Reference a specific arc, moment, or chapter context in the reasoning
- The tagline must feel like something Miura would write — spare, heavy, poetic
- reasoning must be 3 sentences minimum, written in third person, referencing the user as "this soul"
- For THE STRUGGLER specifically: avoid words that imply fragility (flickers, wavers, fades) — this role burns, endures, outlasts
- In reasoning: interpret what the answers reveal about the soul's nature, never quote the answers directly

Return ONLY valid JSON, no markdown, no preamble, nothing outside the object:
{"role":"...","tagline":"...","characters":["...","..."],"arc_reference":"the specific Berserk arc or moment this role is rooted in","reasoning":"..."}`
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