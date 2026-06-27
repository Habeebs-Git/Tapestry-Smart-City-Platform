require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const configureCloudinary = require('./config/cloudinary');

// Initialize Express app
const app = express();

// Connect to MongoDB Atlas
connectDB();

// Configure Cloudinary
configureCloudinary();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/seed', require('./routes/seed'));

// Serve Static Assets from the root directory
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// Clean HTML Page Routing
const servePage = (filePath) => (req, res) => {
  res.sendFile(path.join(__dirname, '../pages', filePath));
};

app.get('/', servePage('index.html'));
app.get('/auth', servePage('auth/index.html'));
app.get('/dashboard', servePage('dashboard/index.html'));
app.get('/report', servePage('report/index.html'));
app.get('/tracking', servePage('tracking/index.html'));
app.get('/profile', servePage('profile/index.html'));
app.get('/admin', servePage('admin/index.html'));
app.get('/manage', servePage('manage/index.html'));
app.get('/map', servePage('map/index.html'));
app.get('/analytics', servePage('analytics/index.html'));

// Fallback for static files or deep URLs
app.use(express.static(path.join(__dirname, '../')));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err.message);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
