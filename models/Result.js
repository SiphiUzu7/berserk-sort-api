const mongoose = require('mongoose')

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  role: String,
  tagline: String,
  characters: [String],
  arc_reference: String,
  reasoning: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Result', resultSchema)