import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  shortId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  mediaUrl: { type: String },
  date: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
});

const Story = mongoose.model('Story', storySchema);

export default Story;
