"""
Session management utilities
"""
import uuid
from datetime import datetime
from typing import Dict, Any
from fastapi import Request

class SessionManager:
    """Manages user sessions for non-authenticated users"""
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    async def get_session(self, request: Request) -> Dict[str, Any]:
        """Get or create a session for the request"""
        session = request.session
        session_id = session.get("session_id")
        
        if not session_id:
            session_id = str(uuid.uuid4())
            session["session_id"] = session_id
            session["created_at"] = datetime.now().isoformat()
            self.active_sessions[session_id] = {
                "predictions": [],
                "last_accessed": datetime.now().isoformat()
            }
        
        return self.active_sessions.get(session_id, {})

    async def update_session(self, request: Request, prediction_data: Dict[str, Any]):
        """Update session with new prediction data"""
        session = request.session
        session_id = session.get("session_id")
        
        if session_id and session_id in self.active_sessions:
            self.active_sessions[session_id]["predictions"].append(prediction_data)
            self.active_sessions[session_id]["last_accessed"] = datetime.now().isoformat()

    def get_session_count(self) -> int:
        """Get the number of active sessions"""
        return len(self.active_sessions)
    
    def cleanup_expired_sessions(self, max_age_hours: int = 24):
        """Clean up sessions older than max_age_hours"""
        current_time = datetime.now()
        expired_sessions = []
        
        for session_id, session_data in self.active_sessions.items():
            last_accessed = datetime.fromisoformat(session_data["last_accessed"])
            age_hours = (current_time - last_accessed).total_seconds() / 3600
            
            if age_hours > max_age_hours:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self.active_sessions[session_id]
        
        return len(expired_sessions)