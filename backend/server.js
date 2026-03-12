const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// 1. Allow your frontend (port 8080) to talk to this backend
app.use(cors());

// 2. Enable JSON body parsing
app.use(express.json());

// 3. Robust path handling for the JSON file
const filePath = path.join(__dirname, 'demo-users.json');

// 4. Load the user data
let demoUsers;
try {
  demoUsers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (err) {
  console.error("Error reading demo-users.json. Check if file exists in the same folder.");
}

// 5. Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log(`Login attempt: ${email}`);

  const user = demoUsers.users.find(u => u.email === email && u.password === password);

  if (user) {
    // Success: Send back a 200 status and user info
    res.status(200).json({ 
      message: 'Login successful', 
      user: { firstName: user.firstName, role: user.role } 
    });
  } else {
    // Failure: Send back a 401 status
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

// 6. Start Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});