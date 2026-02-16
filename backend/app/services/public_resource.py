from typing import Any
from app.services.ai_service import call_openai

class PublicResourceService:
    @staticmethod
    def search_resources(subject: str, topic: str, count: int = 3) -> list[dict[str, Any]]:
        """
        Uses AI to find relevant public domain resources (YouTube, MIT OCW).
        In a real app, this might use the YouTube Search API.
        """
        prompt = (
            f"Find {count} high-quality, free, public domain educational resources (YouTube videos, MIT OCW, or similar) "
            f"for the subject '{subject}' and topic '{topic}'.\n"
            "Return ONLY a JSON list of objects with fields: 'title', 'url', 'source' (e.g., YouTube), and 'type' (e.g., Video).\n"
            "Ensure the URLs are realistic and relevant."
        )
        
        try:
            raw_res = call_openai(prompt, response_mime_type="application/json")
            import json
            resources = json.loads(raw_res)
            return resources if isinstance(resources, list) else []
        except Exception:
            return []

    @staticmethod
    def get_mit_ocw_link(subject: str, topic: str) -> str:
        # Static helper for MIT OCW base links
        mapping = {
            "Physics": "https://ocw.mit.edu/courses/physics/",
            "Mathematics": "https://ocw.mit.edu/courses/mathematics/",
            "Chemistry": "https://ocw.mit.edu/courses/chemistry/"
        }
        return mapping.get(subject, "https://ocw.mit.edu/")
