document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initScoreManagement();
});

function initScoreManagement() {
    // Set up event listeners
    setupEventListeners();
    
    // Load existing scores
    loadScoreList();
}

function setupEventListeners() {
    // Upload form submission
    document.getElementById('upload-form').addEventListener('submit', function(e) {
        e.preventDefault();
        uploadScore();
    });
    
    // Delete confirmation
    document.getElementById('confirm-delete-btn').addEventListener('click', function() {
        const scoreId = this.getAttribute('data-score-id');
        if (scoreId) {
            deleteScore(scoreId);
            $('#delete-confirm-modal').modal('hide');
        }
    });
}

function uploadScore() {
    const titleInput = document.getElementById('score-title');
    const composerInput = document.getElementById('score-composer');
    const fileInput = document.getElementById('score-file');
    const statusMessage = document.getElementById('upload-status');
    
    // Validate inputs
    if (!titleInput.value.trim()) {
        showStatusMessage('error', 'Please enter a score title');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showStatusMessage('error', 'Please select a file to upload');
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // Validate file type
    if (!['xml', 'musicxml', 'mxl'].includes(fileExt)) {
        showStatusMessage('error', 'Invalid file type. Please upload .xml, .musicxml, or .mxl files.');
        return;
    }
    
    // Show uploading status
    showStatusMessage('info', 'Uploading score...');
    
    // Read the file
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Create a unique ID for the score
            const scoreId = 'score_' + Date.now();
            
            // Create score metadata
            const scoreData = {
                id: scoreId,
                title: titleInput.value.trim(),
                composer: composerInput.value.trim() || 'Unknown',
                filename: fileName,
                dateAdded: new Date().toISOString(),
                fileType: fileExt
            };
            
            // Store file content
            localStorage.setItem(scoreId + '_content', e.target.result);
            
            // Store metadata
            const scores = getStoredScores();
            scores.push(scoreData);
            localStorage.setItem('osmd_scores', JSON.stringify(scores));
            
            // Show success message
            showStatusMessage('success', 'Score uploaded successfully!');
            
            // Reset form
            document.getElementById('upload-form').reset();
            
            // Reload score list
            loadScoreList();
        } catch (err) {
            console.error('Error storing score:', err);
            showStatusMessage('error', 'Error saving score. File may be too large for browser storage.');
        }
    };
    
    reader.onerror = function() {
        showStatusMessage('error', 'Error reading file');
    };
    
    // Read the file based on type
    if (fileExt === 'mxl') {
        reader.readAsBinaryString(file);
    } else {
        reader.readAsText(file);
    }
}

function loadScoreList() {
    const scoreList = document.getElementById('score-list');
    const noScoresMessage = document.getElementById('no-scores-message');
    
    // Get stored scores
    const scores = getStoredScores();
    
    // Clear the list
    scoreList.innerHTML = '';
    
    // Check if we have scores
    if (scores.length === 0) {
        noScoresMessage.style.display = 'block';
        return;
    }
    
    // Hide no scores message
    noScoresMessage.style.display = 'none';
    
    // Sort scores by date (newest first)
    scores.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    
    // Add each score to the table
    scores.forEach(score => {
        const row = document.createElement('tr');
        
        // Format date
        const dateAdded = new Date(score.dateAdded);
        const formattedDate = dateAdded.toLocaleDateString() + ' ' + 
                             dateAdded.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        row.innerHTML = `
            <td>${escapeHtml(score.title)}</td>
            <td>${escapeHtml(score.composer)}</td>
            <td>${escapeHtml(score.filename)}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="ui tiny blue button score-action play-score" data-score-id="${score.id}">
                    <i class="play icon"></i> Play
                </button>
                <button class="ui tiny red button score-action delete-score" data-score-id="${score.id}">
                    <i class="trash icon"></i> Delete
                </button>
            </td>
        `;
        
        scoreList.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.play-score').forEach(button => {
        button.addEventListener('click', function() {
            const scoreId = this.getAttribute('data-score-id');
            playScore(scoreId);
        });
    });
    
    document.querySelectorAll('.delete-score').forEach(button => {
        button.addEventListener('click', function() {
            const scoreId = this.getAttribute('data-score-id');
            // Set the score ID in the confirmation button
            document.getElementById('confirm-delete-btn').setAttribute('data-score-id', scoreId);
            // Show confirmation modal
            $('#delete-confirm-modal').modal('show');
        });
    });
}

function playScore(scoreId) {
    // Find the score in our list
    const scores = getStoredScores();
    const score = scores.find(s => s.id === scoreId);
    
    if (!score) {
        showStatusMessage('error', 'Score not found');
        return;
    }
    
    try {
        // Get the score content
        const scoreContent = localStorage.getItem(scoreId + '_content');
        
        if (!scoreContent) {
            showStatusMessage('error', 'Score content not found');
            return;
        }
        
        // Store the score ID to play
        localStorage.setItem('osmd_current_score', scoreId);
        
        // Redirect to player
        window.location.href = 'index1.html?score=' + encodeURIComponent(scoreId);
    } catch (err) {
        console.error('Error playing score:', err);
        showStatusMessage('error', 'Error playing score');
    }
}

function deleteScore(scoreId) {
    try {
        // Get stored scores
        let scores = getStoredScores();
        
        // Find the score to delete
        const scoreIndex = scores.findIndex(s => s.id === scoreId);
        
        if (scoreIndex === -1) {
            showStatusMessage('error', 'Score not found');
            return;
        }
        
        // Remove score content
        localStorage.removeItem(scoreId + '_content');
        
        // Remove from scores array
        scores.splice(scoreIndex, 1);
        
        // Update scores in storage
        localStorage.setItem('osmd_scores', JSON.stringify(scores));
        
        // Show success message
        showStatusMessage('success', 'Score deleted successfully');
        
        // Reload score list
        loadScoreList();
    } catch (err) {
        console.error('Error deleting score:', err);
        showStatusMessage('error', 'Error deleting score');
    }
}

function getStoredScores() {
    try {
        const scoresJson = localStorage.getItem('osmd_scores');
        return scoresJson ? JSON.parse(scoresJson) : [];
    } catch (err) {
        console.error('Error retrieving scores:', err);
        return [];
    }
}

function showStatusMessage(type, message) {
    const statusMessage = document.getElementById('upload-status');
    
    // Remove all classes
    statusMessage.className = 'status-message';
    
    // Add appropriate class
    statusMessage.classList.add(type);
    
    // Set message
    statusMessage.textContent = message;
    
    // Show message
    statusMessage.style.display = 'block';
    
    // Hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
} 