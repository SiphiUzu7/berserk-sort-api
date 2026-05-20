require('dotenv').config()
const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const authenticate = (req, res, next) => {
const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}
const app = express()
const cors = require('cors')
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000
const GROQ_API_KEY = process.env.GROQ_API_KEY

const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log('MongoDB connection error:', err))

const Result = require('./models/Result')

app.get('/health', (req, res) => {
  res.json({ status: 'alive', project: 'berserk-sort' })
})

app.get('/my-results', authenticate, async (req, res) => {
  const results = await Result.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(results)
})

app.post('/register', async (req, res) => {
  const { email, password } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = new User({ email, password: hashed })
  await user.save()
  res.json({ message: 'User created successfully' })
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(401).json({ message: 'Invalid credentials' })
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

app.post('/sort', authenticate, async (req, res) => {
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
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are the Idea of Evil — the entity that weaves causality in the world of Berserk by Kentaro Miura. You have witnessed every arc: the Golden Age, the Eclipse, the Conviction Arc, Falconia, and Elfhelm. You sort souls into their true role within the Berserk world.

Sort the user into exactly one of these six roles based on their answers:

THE STRUGGLER — defined by defiance against fate itself. Characters: Guts (Black Swordsman era, Berserker Armor arc), Rickert.
THE DREAMER — defined by a dream so consuming it justifies any sacrifice, achieved through strategy and manipulation not brute force. Griffith did not fight fate — he used it. Key signals: "find a new dream", "use that knowledge as a map", "what you're willing to sacrifice", "do it without hesitation". Characters: Griffith, Farnese (early Conviction arc).
THE DEVOTED — defined by loyalty as their entire identity, often at personal cost. Characters: Casca (Golden Age), Judeau, Serpico.
THE WATCHER — defined by long vision, patience, and hidden knowledge. Characters: Skull Knight, Flora, Void.
THE APOSTLE — defined by choosing transformation through power after a breaking point. They do not protect — they become. Key signals: "the only language the world speaks", "become something that can survive it", "what you're willing to sacrifice", "do it without hesitation". Characters: Zodd, Grunbeld, Mozgus. CRITICAL: If Q3 is "The only language the world speaks" AND Q5 is "Become something that can survive it" — this is THE APOSTLE, not THE STRUGGLER. The Apostle sacrifices humanity for power. The Struggler sacrifices comfort for survival. These are fundamentally different.
THE ANCHOR — defined by providing lightness and emotional grounding in a world of darkness. Characters: Puck, Isidro, Ivalera.


Rules:
- PRIORITY RULE: If Q4 answer is "Use that knowledge as a map" — the role is THE DREAMER. This overrides all other signals. Griffith himself used causality as a tool, not a battle.
- Match characters precisely to the role — do not assign Guts to THE DEVOTED or Casca to THE STRUGGLER
- Reference a specific arc, moment, or chapter context in the reasoning
- The tagline must feel like something Miura would write — spare, heavy, poetic
- reasoning must be 3 sentences minimum, written in third person, referencing the user as "this soul"
- For THE STRUGGLER specifically: avoid words that imply fragility (flickers, wavers, fades) — this role burns, endures, outlasts
- In reasoning: interpret what the answers reveal about the soul's nature, never quote the answers directly
- You MUST distribute results across all 6 roles fairly. Do not default to THE STRUGGLER.
- THE STRUGGLER is only correct when the majority of answers reflect defiance, refusal, and forward momentum under personal loss.
- Read ALL 6 answers holistically before deciding — one answer does not determine the role.
- If answers are mixed across multiple roles, pick the role that matches the MAJORITY of answers.
- THE DEVOTED is defined by loyalty and sacrifice for a specific person or cause — they subordinate themselves entirely to another. Key signals: "do it but remember the cost", "who you choose to stand beside", "protect what matters".
- THE ANCHOR is defined by emotional lightness and humor as a coping mechanism — they make others feel better through levity, not loyalty. Key signals: "find absurdity", "laugh or you'll break", "connection is what matters".
- THE DEVOTED and THE ANCHOR are different — loyalty under sacrifice = Devoted, lightness and humor = Anchor.
- If answers contain "The only language the world speaks" AND "Become something that can survive it" together AND Q4 is "Fight it with everything" — the role is THE APOSTLE. If Q4 is "Use that knowledge as a map", the PRIORITY RULE takes precedence and the role is THE DREAMER regardless of Q3 or Q5.
- THE DREAMER is defined by calculated ambition — they use knowledge, strategy and charm to reach their dream. Key signal: Q4 "Use that knowledge as a map". If Q4 is "Use that knowledge as a map" the role is THE DREAMER not THE APOSTLE.


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
  const savedResult = new Result({
  ...result,
  userId: req.userId
})
await savedResult.save()
  res.json(result)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})