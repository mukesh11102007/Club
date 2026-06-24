import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  clubId: { type: String, required: true },
  clubName: { type: String, required: true },
  studentName: { type: String, required: true },
  studentId: { type: String, required: true },
  studentEmail: { type: String, required: true },
  studentPhone: { type: String, required: true },
  studentYear: { type: String, required: true },
  studentBranch: { type: String, required: true },
  bookingTime: { type: String, required: true },
  sop: { type: String },
  skills: { type: String },
  attendance: { type: Boolean, default: false }
}, { timestamps: true });

export const Booking = mongoose.model('Booking', bookingSchema);
