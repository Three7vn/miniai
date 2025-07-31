// Global variables
let isRecording = false;
let recognition = null;
let transcripts = [];

// API base URLs
const SPEECH_API_BASE = 'http://localhost:5000/api'; // For transcript storage (if needed)
const TTS_API_BASE = 'http://localhost:5001/api'; // For ElevenLabs TTS

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSpeechRecognition();
    checkWhisperStatus();
    checkElevenLabsStatus();
    loadTranscripts();
    
    // Set up keyboard listener for chat
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleKeyPress);
    }
});

// Initialize Web Speech API
function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            console.log('Speech recognition started');
        };
        
        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update status with interim results
            const voiceStatus = document.getElementById('voiceStatus');
            if (interimTranscript) {
                voiceStatus.textContent = `Listening: "${interimTranscript}"`;
            }
            
            // Store final transcript
            if (finalTranscript) {
                window.currentTranscript = finalTranscript.trim();
                voiceStatus.textContent = `Transcription complete: "${finalTranscript}"`;
                
                // Auto-save transcript
                if (finalTranscript.trim()) {
                    addTranscriptToUI(finalTranscript.trim());
                }
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            const voiceStatus = document.getElementById('voiceStatus');
            voiceStatus.textContent = `Speech recognition error: ${event.error}`;
            isRecording = false;
            updateRecordingUI();
        };
        
        recognition.onend = function() {
            console.log('Speech recognition ended');
            isRecording = false;
            updateRecordingUI();
        };
    } else {
        console.error('Speech recognition not supported');
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) {
            voiceStatus.textContent = 'Speech recognition not supported in this browser';
        }
    }
}

// Voice Recording Functions using Web Speech API
function startRecording() {
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (!recognition) {
        voiceStatus.textContent = 'Speech recognition not available';
        return;
    }
    
    if (isRecording) {
        // Stop recording
        recognition.stop();
        isRecording = false;
        updateRecordingUI();
        voiceStatus.textContent = 'Recording stopped';
    } else {
        // Start recording
        try {
            recognition.start();
            isRecording = true;
            updateRecordingUI();
            voiceStatus.textContent = 'Listening... Speak now!';
        } catch (error) {
            voiceStatus.textContent = `Error starting speech recognition: ${error.message}`;
            console.error('Error starting speech recognition:', error);
        }
    }
}

function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const transcribeBtn = document.getElementById('transcribeBtn');
    
    if (isRecording) {
        recordBtn.textContent = 'Stop Recording';
        recordBtn.style.backgroundColor = '#ff4444';
        transcribeBtn.disabled = true;
    } else {
        recordBtn.textContent = 'Record Voice';
        recordBtn.style.backgroundColor = '';
        transcribeBtn.disabled = true; // No longer needed with real-time transcription
    }
}

// Transcribe function is no longer needed but kept for compatibility
function transcribeAudio() {
    const voiceStatus = document.getElementById('voiceStatus');
    voiceStatus.textContent = 'Transcription happens automatically with Web Speech API!';
}

// Transcript Management Functions
function loadTranscripts() {
    // Load transcripts from local storage
    const localTranscripts = localStorage.getItem('transcripts');
    if (localTranscripts) {
        try {
            transcripts = JSON.parse(localTranscripts);
            displayTranscripts();
        } catch (error) {
            console.error('Error parsing stored transcripts:', error);
            transcripts = [];
            displayTranscripts();
        }
    } else {
        transcripts = [];
        displayTranscripts();
    }
}

function addTranscriptToUI(transcriptText) {
    const transcript = {
        id: Date.now(), // Use timestamp as ID
        text: transcriptText,
        timestamp: new Date().toISOString()
    };
    
    transcripts.push(transcript);
    displayTranscripts();
    
    // Save to backend if available, otherwise use local storage
    saveTranscript(transcript);
}

function saveTranscript(transcript) {
    // Save to local storage
    localStorage.setItem('transcripts', JSON.stringify(transcripts));
}

function displayTranscripts() {
    const transcriptsList = document.getElementById('transcriptsList');
    
    if (transcripts.length === 0) {
        transcriptsList.innerHTML = '<p><em>No transcripts yet. Click "Record Voice" and speak to see results here.</em></p>';
        return;
    }
    
    let html = '';
    transcripts.forEach(transcript => {
        const timestamp = new Date(transcript.timestamp).toLocaleString();
        html += `
            <div class="transcript-item" data-id="${transcript.id}" style="margin-bottom: 10px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;" onclick="selectTranscript(${transcript.id})">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${timestamp}</div>
                <div style="font-weight: bold;">${transcript.text}</div>
                <button onclick="deleteTranscript(${transcript.id}); event.stopPropagation();" style="float: right; font-size: 12px; margin-top: 4px;">Delete</button>
            </div>
        `;
    });
    
    transcriptsList.innerHTML = html;
}

let selectedTranscriptId = null;

function selectTranscript(transcriptId) {
    // Remove previous selection
    const previousSelected = document.querySelector('.transcript-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
        previousSelected.style.backgroundColor = '';
    }
    
    // Select new transcript
    const transcriptElement = document.querySelector(`[data-id="${transcriptId}"]`);
    if (transcriptElement) {
        transcriptElement.classList.add('selected');
        transcriptElement.style.backgroundColor = '#e6f3ff';
        selectedTranscriptId = transcriptId;
    }
}

function deleteTranscript(transcriptId) {
    transcripts = transcripts.filter(t => t.id !== transcriptId);
    displayTranscripts();
    localStorage.setItem('transcripts', JSON.stringify(transcripts));
    
    if (selectedTranscriptId === transcriptId) {
        selectedTranscriptId = null;
    }
}

function clearTranscripts() {
    if (!confirm('Are you sure you want to clear all transcripts?')) {
        return;
    }
    
    transcripts = [];
    selectedTranscriptId = null;
    displayTranscripts();
    localStorage.setItem('transcripts', JSON.stringify(transcripts));
}

function uploadSelectedToMemory() {
    if (!selectedTranscriptId) {
        alert('Please select a transcript first.');
        return;
    }
    
    const selectedTranscript = transcripts.find(t => t.id === selectedTranscriptId);
    if (selectedTranscript) {
        // Add to memory section (placeholder implementation)
        addMemory(selectedTranscript.text);
        alert('Transcript uploaded to memory!');
    }
}

// Status and Connection Functions
async function checkWhisperStatus() {
    const whisperStatus = document.getElementById('whisperStatus');
    
    if (recognition) {
        whisperStatus.textContent = 'Web Speech API Ready';
        whisperStatus.style.color = 'green';
    } else {
        whisperStatus.textContent = 'Not Supported';
        whisperStatus.style.color = 'red';
    }
}

// Chat Functions (existing functionality)
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const message = chatInput.value.trim();
    
    if (message) {
        // Add user message
        const userMessage = document.createElement('p');
        userMessage.innerHTML = `<strong>You:</strong> ${message}`;
        chatMessages.appendChild(userMessage);
        
        // Simple AI response (placeholder)
        setTimeout(() => {
            const aiResponse = document.createElement('p');
            aiResponse.innerHTML = `<strong>Capsule AI:</strong> I received your message: "${message}". This is a placeholder response.`;
            chatMessages.appendChild(aiResponse);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
        
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Memory Functions (placeholder implementations)
function loadRandomMemories() {
    const memoriesList = document.getElementById('memoriesList');
    if (memoriesList) {
        memoriesList.innerHTML = '<p><em>Random memories would be loaded here...</em></p>';
    }
}

function addMemory(text = null) {
    const memoryInput = document.getElementById('memoryInput');
    const memoriesList = document.getElementById('memoriesList');
    
    const memoryText = text || (memoryInput ? memoryInput.value.trim() : '');
    
    if (memoryText) {
        if (memoriesList) {
            const memoryItem = document.createElement('div');
            memoryItem.style.cssText = 'margin-bottom: 10px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;';
            memoryItem.innerHTML = `
                <div style="font-size: 12px; color: #666;">${new Date().toLocaleString()}</div>
                <div>${memoryText}</div>
            `;
            memoriesList.appendChild(memoryItem);
        }
        
        if (memoryInput && !text) {
            memoryInput.value = '';
        }
    }
}

function searchMemories() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const query = searchInput.value.trim();
        if (query) {
            alert(`Searching for: "${query}". This is a placeholder implementation.`);
        }
    }
}

// Text-to-Speech Functions using ElevenLabs
async function playResponse() {
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (!selectedTranscriptId) {
        alert('Please select a transcript first to play as speech.');
        return;
    }
    
    const selectedTranscript = transcripts.find(t => t.id === selectedTranscriptId);
    if (!selectedTranscript) {
        alert('Selected transcript not found.');
        return;
    }
    
    voiceStatus.textContent = 'Converting text to speech...';
    
    try {
        await convertTextToSpeech(selectedTranscript.text);
    } catch (error) {
        voiceStatus.textContent = 'Voice system ready';
        console.error('TTS Error:', error);
    }
}

async function convertTextToSpeech(text) {
    const voiceStatus = document.getElementById('voiceStatus');
    
    try {
        console.log('Converting text to speech:', text);
        const response = await fetch(`${TTS_API_BASE}/text-to-speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('TTS Response:', data);
        
        if (data.status === 'success') {
            voiceStatus.textContent = 'Playing audio...';
            // Play the audio file
            playAudioFile(data.audio_file);
        } else {
            voiceStatus.textContent = 'Voice system ready';
            alert(`Text-to-speech failed: ${data.message}`);
        }
    } catch (error) {
        voiceStatus.textContent = 'Voice system ready';
        console.error('TTS Error:', error);
        alert(`Text-to-speech error: ${error.message}`);
    }
}

function playAudioFile(audioFilePath) {
    const voiceStatus = document.getElementById('voiceStatus');
    
    // Create audio element and play
    const audioUrl = `${TTS_API_BASE}/play-audio/${encodeURIComponent(audioFilePath)}`;
    console.log('Playing audio from:', audioUrl);
    
    const audio = new Audio(audioUrl);
    
    audio.onloadstart = () => {
        console.log('Audio loading started');
    };
    
    audio.oncanplay = () => {
        console.log('Audio can start playing');
    };
    
    audio.onplay = () => {
        console.log('Audio started playing');
        voiceStatus.textContent = 'Playing audio...';
    };
    
    audio.onended = () => {
        console.log('Audio finished playing');
        voiceStatus.textContent = 'Voice system ready';
    };
    
    audio.onerror = (error) => {
        console.error('Audio error:', error);
        voiceStatus.textContent = 'Voice system ready';
        alert('Error playing audio. Please try again.');
    };
    
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
        voiceStatus.textContent = 'Voice system ready';
        alert('Error playing audio. Please try again.');
    });
}

// ElevenLabs Status Check
async function checkElevenLabsStatus() {
    const elevenLabsStatus = document.getElementById('elevenLabsStatus');
    const elevenLabsStatus2 = document.getElementById('elevenLabsStatus2');
    
    try {
        const response = await fetch(`${TTS_API_BASE}/status`);
        const data = await response.json();
        
        if (data.status === 'success') {
            if (elevenLabsStatus) {
                elevenLabsStatus.textContent = 'Connected';
                elevenLabsStatus.style.color = 'green';
            }
            if (elevenLabsStatus2) {
                elevenLabsStatus2.textContent = 'Connected';
                elevenLabsStatus2.style.color = 'green';
            }
        } else {
            if (elevenLabsStatus) {
                elevenLabsStatus.textContent = 'Not Connected';
                elevenLabsStatus.style.color = 'red';
            }
            if (elevenLabsStatus2) {
                elevenLabsStatus2.textContent = 'Not Connected';
                elevenLabsStatus2.style.color = 'red';
            }
        }
    } catch (error) {
        if (elevenLabsStatus) {
            elevenLabsStatus.textContent = 'Connection Error';
            elevenLabsStatus.style.color = 'red';
        }
        if (elevenLabsStatus2) {
            elevenLabsStatus2.textContent = 'Connection Error';
            elevenLabsStatus2.style.color = 'red';
        }
    }
}
