from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
import os
import tempfile
import uuid
from pathlib import Path

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize ElevenLabs client
elevenlabs = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
)

# Directory to store temporary audio files
AUDIO_DIR = Path("temp_audio")
AUDIO_DIR.mkdir(exist_ok=True)

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        # Get text from request
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No text provided'
            }), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({
                'status': 'error',
                'message': 'Empty text provided'
            }), 400
        
        # Generate audio using ElevenLabs
        audio = elevenlabs.text_to_speech.convert(
            text=text,
            voice_id="JBFqnCBsd6RMkjVDRZzb",  # Same voice as in original script
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        
        # Save audio to temporary file
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_path = AUDIO_DIR / audio_filename
        
        # Write audio data to file
        with open(audio_path, 'wb') as f:
            for chunk in audio:
                f.write(chunk)
        
        return jsonify({
            'status': 'success',
            'message': 'Text converted to speech successfully',
            'audio_file': audio_filename
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Text-to-speech conversion failed: {str(e)}'
        }), 500

@app.route('/api/play-audio/<filename>')
def play_audio(filename):
    try:
        audio_path = AUDIO_DIR / filename
        if not audio_path.exists():
            return jsonify({
                'status': 'error',
                'message': 'Audio file not found'
            }), 404
        
        return send_file(audio_path, mimetype='audio/mpeg')
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error serving audio file: {str(e)}'
        }), 500

@app.route('/api/status')
def status():
    """Check if ElevenLabs API is working"""
    try:
        # Simple check to see if we can initialize the client
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            return jsonify({
                'status': 'error',
                'message': 'ElevenLabs API key not found'
            })
        
        return jsonify({
            'status': 'success',
            'message': 'ElevenLabs TTS service is ready',
            'api_key_present': bool(api_key)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'ElevenLabs service error: {str(e)}'
        })

# Cleanup old audio files on startup
def cleanup_old_audio_files():
    """Remove old temporary audio files"""
    try:
        for audio_file in AUDIO_DIR.glob("*.mp3"):
            audio_file.unlink()
        print("Cleaned up old audio files")
    except Exception as e:
        print(f"Error cleaning up audio files: {e}")

if __name__ == '__main__':
    cleanup_old_audio_files()
    print("Starting ElevenLabs TTS Server on http://localhost:5001")
    print("API endpoints:")
    print("  POST /api/text-to-speech - Convert text to speech")
    print("  GET  /api/play-audio/<filename> - Play audio file")
    print("  GET  /api/status - Check service status")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
