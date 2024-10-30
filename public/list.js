let currentPage = 1;
const storiesPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    loadStories();
    
    document.getElementById('load-more').addEventListener('click', loadStories);
});

async function loadStories() {
    try {
        const response = await fetch(`/api/stories?page=${currentPage}&limit=${storiesPerPage}`);
        const stories = await response.json();

        if (stories.length === 0) {
            document.getElementById('load-more').style.display = 'none';
            return;
        }

        const storyList = document.getElementById('story-list');

        for (const story of stories) {
            const storyDetailsResponse = await fetch(`/api/story/${story.shortId}`);
            const storyDetails = await storyDetailsResponse.json();

            const storyElement = createStoryElement(storyDetails);
            storyList.appendChild(storyElement);
        }

        currentPage++;
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

function createStoryElement(story) {
    const storyItem = document.createElement('div');
    storyItem.className = 'story-item';

    if (story.mediaUrl) {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'story-media';

        const imageTypes = /\.(jpeg|jpg|gif|png|webp|bmp|tiff|svg)$/i;
        const videoTypes = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i;

        if (imageTypes.test(story.mediaUrl)) {
            mediaContainer.style.backgroundImage = `url(${story.mediaUrl})`;
        } else if (videoTypes.test(story.mediaUrl)) {
            const videoElement = document.createElement('video');
            videoElement.src = story.mediaUrl;
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.muted = true;
            videoElement.loop = true;
            videoElement.play();
            videoElement.style.pointerEvents = 'none';
            mediaContainer.appendChild(videoElement);
        }

        const overlayText = document.createElement('div');
        overlayText.className = 'overlay-text';
        overlayText.textContent = 'Click to view';
        mediaContainer.appendChild(overlayText);

        storyItem.appendChild(mediaContainer);
    }

    const title = document.createElement('h2');
    title.className = 'story-title';
    title.textContent = story.title;

    const excerpt = document.createElement('p');
    excerpt.className = 'story-excerpt';
    excerpt.innerHTML = truncateToWords(story.content, 20);

    const meta = document.createElement('div');
    meta.className = 'story-meta';

    const authorDate = document.createElement('span');
    authorDate.className = 'story-meta-item story-author-date-item';
    authorDate.textContent = `${story.author} • ${formatDate(story.date)}`;

    const views = document.createElement('span');
    views.className = 'story-meta-item story-views-item';
    views.textContent = `${formatViews(story.views)} views`;

    const likes = document.createElement('span');
    likes.className = 'story-meta-item story-likes-item';
    likes.textContent = `${story.likes || 0} ❤️`;

    meta.appendChild(authorDate);
    meta.appendChild(views);
    meta.appendChild(likes);

    storyItem.appendChild(title);
    storyItem.appendChild(excerpt);
    storyItem.appendChild(meta);

    storyItem.addEventListener('click', () => {
        window.location.href = `/s/${story.shortId}`;
    });

    return storyItem;
}

function truncateToWords(text, maxWords) {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
        return text;
    }
    return words.slice(0, maxWords).join(' ') + ' <span class="view-more">view more..</span>';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'k';
    }
    return views.toString();
}
