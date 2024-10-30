import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import session from 'express-session';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Story from './models/Story.js';
import zlib from 'zlib';
import { promisify } from 'util';
import multer from 'multer';
import fs from 'fs';
import fetch from 'node-fetch';
import moment from 'moment';
import FormData from 'form-data';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

const stories = new Map();

app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

app.use(session({
  secret: 'sazumi-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

function generateShortId() {
  return crypto.randomBytes(3).toString('hex');
}

const compress = promisify(zlib.deflate);
const decompress = promisify(zlib.inflate);

async function compressText(text) {
  const buffer = Buffer.from(text, 'utf-8');
  const compressed = await compress(buffer);
  return compressed.toString('base64');
}

async function decompressText(compressedText) {
  const buffer = Buffer.from(compressedText, 'base64');
  const decompressed = await decompress(buffer);
  return decompressed.toString('utf-8');
}

const upload = multer({ dest: 'uploads/' });

function checkOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin === 'http://localhost:3000' || !origin) {
    next();
  } else {
    res.status(403).send('Not Allowed');
  }
}

app.post('/publish', checkOrigin, upload.single('file'), async (req, res) => {
  const { title, author, story } = req.body;
  const authorId = req.session.userId || crypto.randomBytes(16).toString('hex');
  const shortId = generateShortId();
  req.session.userId = authorId;

  const twelveHoursAgo = moment().subtract(12, 'hours').toDate();
  const recentPosts = await Story.find({
    authorId: authorId,
    createdAt: { $gte: twelveHoursAgo }
  }).sort({ createdAt: -1 }).limit(5);

  if (recentPosts.length >= 5) {
    const oldestPost = recentPosts[recentPosts.length - 1];
    const nextAvailableTime = moment(oldestPost.createdAt).add(12, 'hours');
    const timeUntilNextPost = moment.duration(nextAvailableTime.diff(moment()));
    
    return res.status(429).json({ 
      success: false, 
      error: `You have reached the limit of 5 posts in 12 hours. You can post again in ${timeUntilNextPost.hours()} hours and ${timeUntilNextPost.minutes()} minutes.` 
    });
  }

  let mediaUrl = '';

  if (req.file) {
    const filePath = req.file.path;
    
    try {
        const form = new FormData();
        form.append('files[]', fs.createReadStream(filePath), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const uploadResponse = await fetch('https://qu.ax/upload.php', {
            method: 'POST',
            body: form,
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept': '*/*',
                'Accept-Language': 'en,en-US;q=0.9,id;q=0.8,zh-TW;q=0.7,zh;q=0.6,ja;q=0.5',
                'Origin': 'https://qu.ax',
                'Referer': 'https://qu.ax/'
            }
        });

        const result = await uploadResponse.json();

        if (result.success && result.files && result.files[0]) {
            mediaUrl = result.files[0].url;
        }

        fs.unlinkSync(filePath);
    } catch (error) {
        console.error('Upps, something went wrong!', error);
    }
  }

  try {
    const compressedContent = await compressText(story);
    const newStory = new Story({
      shortId,
      title,
      author,
      content: compressedContent,
      authorId,
      mediaUrl,
      createdAt: new Date()
    });

    const savedStory = await newStory.save();
    res.json({ success: true, id: savedStory.shortId });
  } catch (error) {
    console.error('Error saving story:', error);
    res.status(500).json({ success: false, error: 'Failed to save story' });
  }
});

app.get('/s/:shortId', async (req, res) => {
  try {
    const story = await Story.findOne({ shortId: req.params.shortId });
    if (story) {
      res.sendFile(join(__dirname, 'public', 'story.html'));
    } else {
      res.status(404).sendFile(join(__dirname, 'public', '404.html'));
    }
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).sendFile(join(__dirname, 'public', '404.html'));
  }
});

app.get('/list', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'list.html'));
});

app.get('/api/story/:shortId', async (req, res) => {
  try {
    const story = await Story.findOne({ shortId: req.params.shortId });
    if (story) {
      const decompressedContent = await decompressText(story.content);
      res.json({
        ...story.toObject(),
        content: decompressedContent
      });
    } else {
      res.status(404).sendFile(join(__dirname, 'public', '404.html'));
    }
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).sendFile(join(__dirname, 'public', '404.html'));
  }
});

app.post('/api/story/:shortId/view', async (req, res) => {
  const { shortId } = req.params;
  if (!req.session.viewedStories) {
    req.session.viewedStories = [];
  }
  if (!req.session.viewedStories.includes(shortId)) {
    try {
      const story = await Story.findOneAndUpdate(
        { shortId },
        { $inc: { views: 1 } },
        { new: true }
      );
      if (story) {
        req.session.viewedStories.push(shortId);
        res.json({ success: true, views: story.views });
      } else {
        res.status(404).json({ error: 'Story not found' });
      }
    } catch (error) {
      console.error('Error updating view count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    const story = await Story.findOne({ shortId });
    res.json({ success: true, views: story.views });
  }
});

app.get('/api/current-user', (req, res) => {
  if (req.session.userId) {
    res.json({ id: req.session.userId });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.delete('/api/story/:shortId', async (req, res) => {
  try {
    const story = await Story.findOne({ shortId: req.params.shortId });
    if (story && story.authorId === req.session.userId) {
      await Story.findOneAndDelete({ shortId: req.params.shortId });
      res.json({ success: true, message: 'Story deleted successfully' });
    } else {
      res.status(403).json({ error: 'Unauthorized to delete this story' });
    }
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Error deleting story' });
  }
});

app.get('/api/stories', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const stories = await Story.find()
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .select('shortId title content author date views');

        const decompressedStories = await Promise.all(stories.map(async (story) => {
            const decompressedContent = await decompressText(story.content);
            return {
                ...story.toObject(),
                content: decompressedContent
            };
        }));

        res.json(decompressedStories);
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/story/:shortId/toggle-like', async (req, res) => {
  try {
    const { shortId } = req.params;
    const { action } = req.body;

    const updateOperation = action === 'like' ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } };

    const story = await Story.findOneAndUpdate(
      { shortId },
      updateOperation,
      { new: true }
    );

    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    res.json({ success: true, likes: story.likes });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.use((req, res, next) => {
  res.status(404).sendFile(join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(join(__dirname, 'public', '404.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
