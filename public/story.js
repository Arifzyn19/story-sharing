async function loadStory() {
  const shortId = window.location.pathname.split('/').pop();
  try {
      const response = await fetch(`/api/story/${shortId}`);
      if (response.ok) {
          const story = await response.json();
          if (story) {
              const pageTitle = `${story.title} - By ${story.author}`;
              const defaultDescription = "Share Your Story - A platform to publish and read personal stories. Write, upload media, and connect with readers from around the world.";
              
              document.getElementById('page-title').textContent = pageTitle;
              
              document.getElementById('og-title').setAttribute('content', pageTitle);
              const description = story.content && story.content.trim() !== '' 
                  ? story.content.substring(0, 200) + (story.content.length > 200 ? '...' : '')
                  : defaultDescription;
              document.getElementById('og-description').setAttribute('content', description);
              
              document.getElementById('og-url').setAttribute('content', window.location.href);
              if (story.mediaUrl) {
                  document.getElementById('og-image').setAttribute('content', story.mediaUrl);
              } else {
                  document.getElementById('og-image').setAttribute('content', 'https://cdn.jsdelivr.net/gh/SazumiVicky/Storage@main/sazumiviki-ico.ico');
              }
              
              document.getElementById('story-title').textContent = `"${story.title}"`;
              const storyDate = new Date(story.date).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric'
              });
              
              document.getElementById('story-author').innerHTML = `By ${story.author} <span class="bullet">&bull;</span> ${storyDate}`;
              
              const contentWithLinks = convertLinksToClickable(story.content);
              document.getElementById('story-content').innerHTML = contentWithLinks;
              
              if (story.mediaUrl) {
                  const mediaContainer = document.getElementById('media-container');
                  const mediaElement = story.mediaUrl.includes('.mp4') 
                    ? document.createElement('video')
                    : document.createElement('img');
                  
                  mediaElement.src = story.mediaUrl;
                  mediaElement.classList.add('media-blur');
                  
                  if (mediaElement.tagName === 'VIDEO') {
                      mediaElement.muted = true;
                      mediaElement.playsInline = true;
                      mediaElement.loop = true;
                      mediaElement.autoplay = true;
                  }
                  
                  const messageElement = document.createElement('div');
                  messageElement.className = 'media-message';
                  messageElement.textContent = 'Click media to view full';
                  
                  mediaContainer.appendChild(mediaElement);
                  mediaContainer.appendChild(messageElement);
                  
                  mediaElement.addEventListener('load', () => handleMediaLoad(mediaElement, messageElement));
                  if (mediaElement.tagName === 'VIDEO') {
                      mediaElement.addEventListener('loadeddata', () => handleMediaLoad(mediaElement, messageElement));
                  }
              } else {
                  const mediaContainer = document.getElementById('media-container');
                  if (mediaContainer) {
                      mediaContainer.style.display = 'none';
                  }
              }
              
              const userResponse = await fetch('/api/current-user');
              if (userResponse.ok) {
                  const userData = await userResponse.json();
                  if (userData.id === story.authorId) {
                      const deleteButton = document.getElementById('delete-button');
                      deleteButton.style.display = 'block';
                      deleteButton.addEventListener('click', () => deleteStory(shortId));
                  }
              }

              await incrementViewCount(shortId);
              const viewResponse = await fetch(`/api/story/${shortId}/view`, { method: 'POST' });
              if (viewResponse.ok) {
                  const viewData = await viewResponse.json();
                  const formattedViews = formatViewCount(viewData.views);
                  document.getElementById('story-views').textContent = `Total View: ${formattedViews}`;
              }

              const likeButton = document.getElementById('like-button');
              const likeCount = document.getElementById('like-count');
              likeButton.dataset.storyId = story.shortId;
              likeCount.textContent = story.likes || 0;

              const isLiked = localStorage.getItem(`liked_${story.shortId}`) === 'true';
              updateLikeButtonState(isLiked);

              likeButton.addEventListener('click', handleLikeClick);
          }
      } else {
          throw new Error('Story not found');
      }
  } catch (error) {
      console.error('Error loading story:', error);
      document.body.innerHTML = '<h1>Story not found</h1>';
  }
}

function formatViewCount(views) {
  if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M';
  } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'k';
  }
  return views.toString();
}

async function incrementViewCount(shortId) {
  try {
      await fetch(`/api/story/${shortId}/view`, { method: 'POST' });
  } catch (error) {
      console.error('Error incrementing view count:', error);
  }
}

async function deleteStory(shortId) {
  try {
      const response = await fetch(`/api/story/${shortId}`, {
          method: 'DELETE',
      });
      if (response.ok) {
          window.location.href = '/';
      } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete story');
      }
  } catch (error) {
      console.error('Error deleting story:', error);
      alert('Failed to delete story: ' + error.message);
  }
}

function convertLinksToClickable(text) {
  const urlRegex = /\b((https?|ftp):\/\/)?(www\.)?((xn--)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,63}|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/[a-zA-Z0-9#?=&.-]*)?(\?[a-zA-Z0-9=&%-]*)?(#[a-zA-Z0-9-]*)?\b/g;
  return text.replace(urlRegex, function(url) {
      let href = url;
      if (!url.match(/^https?:\/\//)) {
          href = 'http://' + url;
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="story-link">${url}</a>`;
  });
}

function updateLikeButtonState(isLiked) {
  const likeButton = document.getElementById('like-button');
  const heartIcon = likeButton.querySelector('.heart-icon');
  
  if (isLiked) {
      likeButton.classList.remove('not-liked');
      likeButton.classList.add('liked');
      heartIcon.textContent = '💙';
      heartIcon.style.color = '#3498db';
  } else {
      likeButton.classList.remove('liked');
      likeButton.classList.add('not-liked');
      heartIcon.textContent = '❤️';
      heartIcon.style.color = '#e74c3c';
  }
}

async function handleLikeClick(event) {
  const likeButton = event.currentTarget;
  const shortId = likeButton.dataset.storyId;
  const likeCount = document.getElementById('like-count');
  const isLiked = likeButton.classList.contains('liked');

  try {
      const response = await fetch(`/api/story/${shortId}/toggle-like`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: isLiked ? 'unlike' : 'like' }),
      });

      if (response.ok) {
          const result = await response.json();
          likeCount.textContent = result.likes;

          if (isLiked) {
              localStorage.removeItem(`liked_${shortId}`);
          } else {
              localStorage.setItem(`liked_${shortId}`, 'true');
              createConfetti(this);
          }

          updateLikeButtonState(!isLiked);
      }
  } catch (error) {
      console.error('Error toggling like:', error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadStory();
  setupMediaClickHandler();
  initializeLikeButton();
  const likeButton = document.getElementById('like-button');
  likeButton.addEventListener('click', handleLikeClick);
});

function setupMediaClickHandler() {
const mediaContainer = document.getElementById('media-container');

mediaContainer.addEventListener('click', (event) => {
  if (event.target.tagName === 'IMG' || event.target.tagName === 'VIDEO') {
    showFullsizeMedia(event.target.src, event.target.tagName.toLowerCase());
  }
});
}

function showFullsizeMedia(src, type) {
const fullsizeContainer = document.createElement('div');
fullsizeContainer.className = 'fullsize-media';

const mediaElement = document.createElement(type);
mediaElement.src = src;

if (type === 'video') {
  mediaElement.controls = true;
  mediaElement.playsInline = true;
  mediaElement.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mediaElement.requestFullscreen) {
      mediaElement.requestFullscreen();
    } else if (mediaElement.webkitRequestFullscreen) {
      mediaElement.webkitRequestFullscreen();
    } else if (mediaElement.mozRequestFullScreen) {
      mediaElement.mozRequestFullScreen();
    } else if (mediaElement.msRequestFullscreen) {
      mediaElement.msRequestFullscreen();
    }
  });
}

fullsizeContainer.appendChild(mediaElement);

fullsizeContainer.addEventListener('click', () => {
  if (type === 'video' && (document.fullscreenElement || document.webkitFullscreenElement)) {
    return;
  }
  document.body.removeChild(fullsizeContainer);
});

document.body.appendChild(fullsizeContainer);
if (type === 'video') {
  mediaElement.play().catch(e => console.log('Auto-play prevented:', e));
}
}

function handleMediaLoad(mediaElement, messageElement) {
setTimeout(() => {
  mediaElement.classList.remove('media-blur');
  messageElement.classList.add('show');
  
  setTimeout(() => {
    messageElement.classList.remove('show');
  }, 3000);
}, 1000);
}

function createConfetti(button) {
  const confettiContainer = document.createElement('div');
  confettiContainer.classList.add('confetti-container');
  
  const rect = button.getBoundingClientRect();
  const buttonCenterX = rect.left + rect.width / 2;
  const buttonCenterY = rect.top + rect.height / 2;
  
  confettiContainer.style.left = `${buttonCenterX}px`;
  confettiContainer.style.top = `${buttonCenterY}px`;
  document.body.appendChild(confettiContainer);

  for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.classList.add('confetti');
      confetti.style.backgroundColor = getRandomColor();
      
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 30;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const rotation = Math.random() * 360;
      
      confetti.style.setProperty('--tx', `${tx}px`);
      confetti.style.setProperty('--ty', `${ty}px`);
      confetti.style.setProperty('--r', `${rotation}deg`);
      
      confettiContainer.appendChild(confetti);
  }

  setTimeout(() => {
      document.body.removeChild(confettiContainer);
  }, 1000);
}

function getRandomColor() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function initializeLikeButton() {
  const likeButton = document.getElementById('like-button');
  const shortId = likeButton.dataset.storyId;
  const isLiked = localStorage.getItem(`liked_${shortId}`) === 'true';
  updateLikeButtonState(isLiked);
}

document.addEventListener('DOMContentLoaded', function() {
  const backHomeButton = document.getElementById('back-home-button');
  backHomeButton.addEventListener('click', function() {
      window.location.href = '/';
  });
});
