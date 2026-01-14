import re
import uuid


def format_duration(seconds: int) -> str:
    """Convert seconds to human-readable duration format (HH:MM:SS or MM:SS)."""
    if seconds < 0:
        return "0:00"

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def sanitize_filename(filename: str) -> str:
    """Remove or replace characters that are invalid in filenames."""
    # Replace invalid characters with underscores
    invalid_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(invalid_chars, '_', filename)

    # Remove leading/trailing whitespace and dots
    sanitized = sanitized.strip().strip('.')

    # Limit length to 200 characters to leave room for extension and path
    if len(sanitized) > 200:
        sanitized = sanitized[:200]

    return sanitized


def generate_session_id() -> str:
    """Generate a unique session ID for tracking downloads."""
    return str(uuid.uuid4())
