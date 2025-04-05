

from flask import Flask, request, jsonify
from transformers import pipeline
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from flask_cors import CORS

# Download VADER lexicon
nltk.download("vader_lexicon")

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=["https://mentalhealthplatform.onrender.com"], supports_credentials=True)
# Load AI sentiment analysis model
classifier = pipeline("sentiment-analysis", model="siebert/sentiment-roberta-large-english")

# Initialize VADER sentiment analyzer
analyzer = SentimentIntensityAnalyzer()

# High-risk phrases
HIGH_RISK_PHRASES = {"i want to die", "kill myself", "suicidal", "no reason to live", "end my life", "self harm", "depressed"}

def calculate_mental_health_score(text):
    """Calculate a mental health score (0-100) based on sentiment and crisis word detection."""
    text_lower = text.lower()

    # Check for crisis phrases
    is_high_risk = any(phrase in text_lower for phrase in HIGH_RISK_PHRASES)

    # Sentiment analysis
    sentiment = analyzer.polarity_scores(text)
    ai_sentiment = classifier(text)[0]["label"]

    # Base score from sentiment
    score = (sentiment["pos"] - sentiment["neg"]) * 50 + 50

    # Adjust score based on AI sentiment
    if ai_sentiment == "POSITIVE":
        score += 10
    elif ai_sentiment == "NEGATIVE":
        score -= 10

    # Critical override for crisis words
    if is_high_risk:
        score = min(score, 20)  # Ensure the score stays low

    # Normalize score between 0-100
    score = max(0, min(100, score))
    if score <= 20:
        ai_sentiment = "NEGATIVE"

    return {
        "mental_health_score": round(score, 2),
        "sentiment_analysis": sentiment,
        "ai_sentiment": ai_sentiment,
        "high_risk": is_high_risk
    }

@app.route("/analyze", methods=["POST"])
def analyze_text():
    """API endpoint to analyze text and return a mental health score."""
    data = request.json
    if "text" not in data:
        return jsonify({"error": "Text input required"}), 400

    response = calculate_mental_health_score(data["text"])
    return jsonify(response)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Use Render's assigned port
    from waitress import serve  # Production-ready server
    serve(app, host="0.0.0.0", port=port)
# import os

# port = int(os.environ.get("PORT", 5001))

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=port)

# if __name__ == "__main__":
#     from waitress import serve  # Production-ready server
#     serve(app, host="0.0.0.0", port=5001)
