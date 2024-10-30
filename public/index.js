document.addEventListener('DOMContentLoaded', () => {
    const storyForm = document.getElementById('story-form');
    const fileInput = document.getElementById('media');
    const fileInputLabel = document.querySelector('.file-input-label span');
    const publishButton = document.getElementById('publish-button');
    const blockIcon = document.getElementById('block-icon');
    const storyInput = document.getElementById('story');

    if (storyForm) {
        storyForm.addEventListener('submit', publishStory);
    } else {
        console.error('Story form not found');
    }

    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const fileName = event.target.files[0]?.name;
            if (fileName) {
                const truncatedName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
                fileInputLabel.textContent = truncatedName;
            } else {
                fileInputLabel.textContent = 'Choose file';
            }
            updatePublishButtonState();
        });
    }

    function updatePublishButtonState() {
        const isStoryEmpty = storyInput.value.trim() === '';
        const hasMedia = fileInput.files.length > 0;
        const shouldDisable = !hasMedia && isStoryEmpty;
        publishButton.disabled = shouldDisable;
        blockIcon.style.display = shouldDisable ? 'block' : 'none';
    }

    updatePublishButtonState();
    storyInput.addEventListener('input', updatePublishButtonState);
});

const badwords = [
    "konto", "anjeng", "memek", "hitam", "nigga", "niggers", "goblok", "asu", "anjing", 
    "asuu", "jasjus", "ngentot", "ngewe", "kontol", "jancok", "cok", "coeg", "kampret", 
    "babi", "bangsat", "fuck", "shit", "asshole", "bitch", "dick", "pussy", "tai", "tahi"
];

const badwordsRegex = new RegExp(`\\b(${badwords.join('|')})\\b`, 'gi');

function checkBadwords(text) {
    const match = text.match(badwordsRegex);
    return match ? match[0] : null;
}

function showErrorAndRedirect(message) {
    const popup = document.getElementById('error-popup');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    popup.classList.add('show');
    
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => {
            window.location.href = '/';
        }, 300);
    }, 4700);
}

function showErrorPopup(title, message) {
    const popup = document.getElementById('error-popup');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    popup.classList.add('show');
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, 5000);
}

async function publishStory() {
    event.preventDefault();

    const publishButton = document.getElementById('publish-button');
    const buttonText = document.getElementById('button-text');
    const loadingIcon = document.getElementById('loading-icon');
    const blockIcon = document.getElementById('block-icon');
    
    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('author').value.trim();
    const story = document.getElementById('story').value.trim();
    const mediaFile = document.getElementById('media').files[0];
    
    const badword = checkBadwords(title) || checkBadwords(author) || checkBadwords(story);
    if (badword) {
        showErrorPopup('Badword Detected', `The word "${badword}" is not allowed.`);
        return;
    }

    if (!story && !mediaFile) {
        alert('Please enter your story or choose a media file before publishing.');
        return;
    }

    publishButton.disabled = true;
    buttonText.style.display = 'none';
    loadingIcon.style.display = 'inline-block';
    blockIcon.style.display = 'none';

    const formData = new FormData();
    formData.append('title', title || "Untitled post");
    formData.append('author', author || "Anonymous");
    formData.append('story', story);
    if (mediaFile) {
        formData.append('file', mediaFile);
    }

    try {
        const response = await fetch('/publish', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = `/s/${result.id}`;
        } else {
            if (response.status === 429) {
                showErrorPopup('Limited Post', result.error);
            } else {
                showErrorPopup('Error', result.error || 'An error occurred while publishing the story.');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorPopup('Error', 'An error occurred while publishing the story.');
    }

    publishButton.disabled = false;
    buttonText.style.display = 'inline-block';
    loadingIcon.style.display = 'none';
    updatePublishButtonState();
}
