import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Club } from './models/Club.js';
import { Booking } from './models/Booking.js';
import { Report } from './models/Report.js';
import Attendance from './models/Attendance.js';
import { User } from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage: storage });

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Seed Clubs Route (Initial Data Load)
app.post('/api/clubs/seed', async (req, res) => {
  try {
    const clubs = req.body;
    await Club.deleteMany({});
    await Club.insertMany(clubs);
    res.json({ message: 'Clubs seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all clubs
app.get('/api/clubs', async (req, res) => {
  try {
    const clubs = await Club.find();
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update single club slot
app.put('/api/clubs/:id/slots', async (req, res) => {
  try {
    const { slotsRemaining } = req.body;
    const club = await Club.findOneAndUpdate({ id: req.params.id }, { slotsRemaining }, { new: true });
    res.json(club);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const bookingDetails = req.body;
    
    // Check if slot available
    const club = await Club.findOne({ id: bookingDetails.clubId });
    if (!club || club.slotsRemaining <= 0) {
      return res.status(409).json({ error: 'Conflict: No slots remaining' });
    }

    // Check duplicate (One club per student)
    const existing = await Booking.findOne({ studentEmail: bookingDetails.studentEmail });
    if (existing) {
      return res.status(400).json({ error: 'Duplicate booking: You are already registered for a club.' });
    }

    // Decrement slots
    club.slotsRemaining -= 1;
    await club.save();

    const booking = new Booking(bookingDetails);
    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update attendance
app.put('/api/bookings/:id/attendance', async (req, res) => {
  try {
    const { attendance } = req.body;
    const booking = await Booking.findOneAndUpdate({ bookingId: req.params.id }, { attendance }, { new: true });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ bookingId: req.params.id });
    if (booking) {
      // Restore slot
      await Club.findOneAndUpdate({ id: booking.clubId }, { $inc: { slotsRemaining: 1 } });
    }
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a new report
app.post('/api/reports', upload.single('report'), async (req, res) => {
  try {
    const { clubId, clubName, submittedBy } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const report = new Report({
      clubId,
      clubName,
      submittedBy,
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype
    });
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get all attendance records (optional filter by clubId)
app.get('/api/attendance', async (req, res) => {
  try {
    const { clubId } = req.query;
    const filter = clubId ? { clubId } : {};
    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance records for a club
app.get('/api/attendance/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const records = await Attendance.find({ clubId }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upsert (Record/Update) Attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { clubId, studentEmail, studentName, date, status } = req.body;
    
    // Find and update if exists, otherwise create
    const record = await Attendance.findOneAndUpdate(
      { clubId, studentEmail, date },
      { studentName, status },
      { new: true, upsert: true }
    );
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, year } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const user = new User({ name, email, password, year });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name, password: 'google-oauth', role: role || 'student' });
      await user.save();
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, retrying in 1s...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    throw err;
  }
});

// Graceful shutdown so node --watch can release the port before restarting
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
