# Story Sharing Web Application

A minimalist story sharing platform inspired by Telegraph, allowing users to publish and share stories with media support.

## 🌟 Features

- Create and share stories with text and media
- Support for images and videos
- View counter and like system
- Mobile-responsive design
- Rate limiting (5 posts/12 hours)
- Bad word filtering
- Story listing with pagination

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **File Upload**: Multer with qu.ax integration
- **Session Management**: express-session
- **Other**: moment.js, cors, dotenv

## 🚀 Quick Start

1. Clone the repository
   ```bash
   git clone https://github.com/sazumivicky/story-sharing-app.git
   cd story-sharing-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with:
   ```env
   MONGODB_URI=xxxxx
   ```

4. Start the server
   ```bash
   npm start
   ```

## 🐳 Docker Support

Build and run with Docker:
```bash
docker build -t story-sharing-app .
docker run -p 3000:3000 story-sharing-app
```

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🙏 Credits

Created by [Viki] - Inspired by [Telegraph](https://telegra.ph)