import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Club } from './models/Club.js';
import { Booking } from './models/Booking.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// Update single club slot (Not strictly necessary if booking handles it, but good for admin)
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

    // Check duplicate
    const existing = await Booking.findOne({ clubId: bookingDetails.clubId, studentEmail: bookingDetails.studentEmail });
    if (existing) {
      return res.status(400).json({ error: 'Duplicate booking' });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
