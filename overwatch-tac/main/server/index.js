const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Endpoint to get all users (UID, email, displayName)
app.get('/users', async (req, res) => {
  try {
    const list = await admin.auth().listUsers();
    const users = list.users.map(u => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
    }));
    res.json(users); // send JSON to frontend
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Basic test route
app.get('/', (req, res) => {
  res.send('broooooo');
});

app.listen(5001, () => {
  console.log('running at http://localhost:5001/');
});