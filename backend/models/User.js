import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  year: { type: String },
  role: { type: String, default: 'student' }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
