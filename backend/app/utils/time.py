from datetime import datetime, timezone



def to_relative_time(timestamp: datetime) -> str:
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    delta = datetime.now(timezone.utc) - timestamp
    seconds = int(delta.total_seconds())

    if seconds < 60:
        return "just now"
    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"

    days = seconds // 86400
    return f"{days} day{'s' if days != 1 else ''} ago"
