"""
Voice Channel Handler for Marketplace Agent
Handles automated voice calls using Twilio Voice API + speech recognition
"""

from typing import Dict, Optional, Callable


class VoiceHandler:
    """
    Handles automated voice communication for marketplace listings

    Uses:
    - Twilio Voice API for calls
    - Speech-to-text for inquiry recognition
    - Text-to-speech for responses
    """

    def __init__(self, voice_config: Dict):
        """
        Initialize voice handler

        Args:
            voice_config: Dict containing:
                - account_sid: Twilio account SID
                - auth_token: Twilio auth token
                - phone_number: Your Twilio phone number
                - voice: TTS voice (default: 'Polly.Joanna')
        """
        self.account_sid = voice_config.get('account_sid')
        self.auth_token = voice_config.get('auth_token')
        self.phone_number = voice_config.get('phone_number')
        self.voice = voice_config.get('voice', 'Polly.Joanna')  # Amazon Polly voice

        # Import Twilio if credentials provided
        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
                self.enabled = True
            except ImportError:
                print("⚠ Twilio not installed. Run: pip install twilio")
                self.enabled = False
        else:
            print("⚠ Voice not configured (missing Twilio credentials)")
            self.enabled = False

    def create_voice_response_twiml(self, message: str, gather_input: bool = False) -> str:
        """
        Create TwiML for voice response

        Args:
            message: Text to speak
            gather_input: Whether to gather caller's response

        Returns:
            TwiML XML string
        """
        from twilio.twiml.voice_response import VoiceResponse, Gather

        response = VoiceResponse()

        if gather_input:
            # Gather caller's speech input
            gather = Gather(
                input='speech',
                action='/voice/process',
                speech_timeout='auto',
                language='en-US'
            )
            gather.say(message, voice=self.voice)
            response.append(gather)

            # Fallback if no input
            response.say("I didn't catch that. Please call back or text me instead. Goodbye!")
        else:
            # Just speak message and hang up
            response.say(message, voice=self.voice)

        return str(response)

    def make_outbound_call(self, to_phone: str, message: str) -> bool:
        """
        Make an outbound call with a message

        Args:
            to_phone: Phone number to call
            message: Message to speak

        Returns:
            True if call initiated successfully
        """
        if not self.enabled:
            print("✗ Voice not enabled")
            return False

        try:
            # Create TwiML for the message
            twiml = self.create_voice_response_twiml(message, gather_input=False)

            # Make call
            call = self.client.calls.create(
                twiml=twiml,
                from_=self.phone_number,
                to=to_phone
            )

            print(f"✓ Call initiated to {to_phone} (SID: {call.sid})")
            return True

        except Exception as e:
            print(f"✗ Failed to make call: {e}")
            return False

    def get_call_logs(self, limit: int = 20) -> list:
        """
        Get recent call logs

        Args:
            limit: Number of recent calls to retrieve

        Returns:
            List of call records
        """
        if not self.enabled:
            return []

        try:
            calls = self.client.calls.list(limit=limit)

            return [{
                'sid': call.sid,
                'from': call.from_,
                'to': call.to,
                'status': call.status,
                'duration': call.duration,
                'start_time': call.start_time,
                'price': call.price
            } for call in calls]

        except Exception as e:
            print(f"✗ Failed to get call logs: {e}")
            return []

    @staticmethod
    def parse_webhook_request(request_data: Dict) -> Dict:
        """
        Parse incoming Twilio voice webhook request

        Args:
            request_data: POST data from Twilio webhook

        Returns:
            Dict with parsed call data
        """
        return {
            'from': request_data.get('From'),
            'to': request_data.get('To'),
            'call_sid': request_data.get('CallSid'),
            'call_status': request_data.get('CallStatus'),
            'speech_result': request_data.get('SpeechResult'),  # Speech-to-text result
            'confidence': request_data.get('Confidence')
        }


# Flask webhook example for voice (for reference)
"""
from flask import Flask, request
from twilio.twiml.voice_response import VoiceResponse, Gather

app = Flask(__name__)
agent = MarketplaceAgent('config/product.json')
voice_handler = VoiceHandler(voice_config)

@app.route('/voice/incoming', methods=['POST'])
def voice_incoming():
    '''Handle incoming call'''
    response = VoiceResponse()

    # Greeting
    gather = Gather(
        input='speech',
        action='/voice/process',
        speech_timeout='auto',
        language='en-US'
    )
    gather.say(
        "Hello! You've reached the automated listing agent for a Persol sunglasses sale. "
        "How can I help you today?",
        voice='Polly.Joanna'
    )
    response.append(gather)

    return str(response)

@app.route('/voice/process', methods=['POST'])
def voice_process():
    '''Process caller's speech and respond'''
    # Get speech-to-text result
    speech_result = request.form.get('SpeechResult', '')

    # Process with agent
    agent_response = agent.process_inquiry(speech_result, 'voice', {
        'phone': request.form.get('From')
    })

    # Create voice response
    response = VoiceResponse()

    if agent_response.get('response'):
        # Speak agent's response
        response.say(agent_response['response'], voice='Polly.Joanna')

        # If negotiation or question, gather more input
        if agent_response.get('action') in ['negotiation', 'general_question']:
            gather = Gather(
                input='speech',
                action='/voice/process',
                speech_timeout='auto'
            )
            gather.say("Is there anything else?", voice='Polly.Joanna')
            response.append(gather)
    else:
        response.say("Thank you for calling. Goodbye!", voice='Polly.Joanna')

    return str(response)

if __name__ == '__main__':
    app.run(port=5000)
"""
