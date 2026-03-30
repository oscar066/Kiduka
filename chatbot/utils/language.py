from .logger import logger

try:
    from langdetect import detect, DetectorFactory
    DetectorFactory.seed = 0
except ImportError:
    detect = None

def get_language(text: str) -> str:
    """
    Detects the language of the given text.
    Returns 'en' for English, or the detected language code.
    Falls back to a simple heuristic if langdetect is unavailable or fails.
    """
    if not text or len(text.strip()) < 3:
        return "unknown"

    if detect:
        try:
            lang = detect(text)
            return lang
        except Exception as e:
            logger.warning(f"langdetect failed: {e}. Falling back to heuristic.")

    # Simple heuristic fallback for English
    english_keywords = ["what", "how", "why", "where", "when", "is", "are", "the", "cervical", "cancer", "screening"]
    if any(word in text.lower() for word in english_keywords):
        return "en"
    
    return "unknown"