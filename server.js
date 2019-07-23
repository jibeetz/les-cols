// app.js
const express = require('express')

// Create Express app
const app = express()

app.use(express.static('app'));

// A sample route
app.get('app/', (req, res) => res.send('Hello World!'))

// Start the Express server
app.listen(3000, () => console.log('Server running on port 3000!'))