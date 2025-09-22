"""
A2A Security Layer - Enterprise Features
Adds authentication, encryption, and data sanitization to A2A protocol
"""

import hashlib
import hmac
import json
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from python.helpers.print_style import PrintStyle

class A2ASecurity:
    """
    Security layer for A2A communication
    Provides authentication, sanitization, and audit logging
    """
    
    def __init__(self, secret_key: str = "default_secret_change_me"):
        self.secret_key = secret_key
        self.audit_log = []
        self.data_classifications = {
            "public": 0,
            "internal": 1,
            "confidential": 2,
            "secret": 3
        }
        
    def generate_token(self, agent_id: str, permissions: List[str]) -> str:
        """Generate authentication token for agent"""
        payload = {
            "agent_id": agent_id,
            "permissions": permissions,
            "timestamp": datetime.now().isoformat()
        }
        message = json.dumps(payload)
        signature = hmac.new(
            self.secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{message}:{signature}"
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify authentication token"""
        try:
            message, signature = token.split(":")
            expected_sig = hmac.new(
                self.secret_key.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if hmac.compare_digest(signature, expected_sig):
                return json.loads(message)
            return None
        except:
            return None
    
    def sanitize_data(
        self,
        message: str,
        classification: str = "public",
        remove_pii: bool = True
    ) -> str:
        """
        Sanitize message based on classification level
        Removes PII and sensitive data
        """
        sanitized = message
        
        if remove_pii:
            # Remove email addresses
            sanitized = re.sub(
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                '[EMAIL_REDACTED]',
                sanitized
            )
            
            # Remove phone numbers
            sanitized = re.sub(
                r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
                '[PHONE_REDACTED]',
                sanitized
            )
            
            # Remove SSN patterns
            sanitized = re.sub(
                r'\b\d{3}-\d{2}-\d{4}\b',
                '[SSN_REDACTED]',
                sanitized
            )
            
            # Remove credit card patterns
            sanitized = re.sub(
                r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
                '[CC_REDACTED]',
                sanitized
            )
            
            # Remove IP addresses
            sanitized = re.sub(
                r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
                '[IP_REDACTED]',
                sanitized
            )
        
        # Apply classification-based filtering
        if classification == "public":
            # Remove anything marked as confidential
            sanitized = re.sub(
                r'\[CONFIDENTIAL:.*?\]',
                '[REDACTED]',
                sanitized
            )
            sanitized = re.sub(
                r'\[SECRET:.*?\]',
                '[REDACTED]',
                sanitized
            )
        
        return sanitized
    
    def can_share_data(
        self,
        data_classification: str,
        requester_clearance: str
    ) -> bool:
        """Check if data can be shared based on classification levels"""
        data_level = self.data_classifications.get(data_classification, 3)
        clearance_level = self.data_classifications.get(requester_clearance, 0)
        return clearance_level >= data_level
    
    def encrypt_message(self, message: str) -> str:
        """
        Simple encryption (in production, use proper encryption like AES)
        This is just a demonstration
        """
        # In production, use cryptography library with AES-256
        # This is just a basic XOR for demonstration
        key = self.secret_key.encode()
        encrypted = []
        for i, char in enumerate(message.encode()):
            encrypted.append(char ^ key[i % len(key)])
        return bytes(encrypted).hex()
    
    def decrypt_message(self, encrypted_hex: str) -> str:
        """
        Simple decryption (matches the encrypt_message method)
        """
        encrypted = bytes.fromhex(encrypted_hex)
        key = self.secret_key.encode()
        decrypted = []
        for i, byte in enumerate(encrypted):
            decrypted.append(byte ^ key[i % len(key)])
        return bytes(decrypted).decode()
    
    def log_transaction(
        self,
        from_agent: str,
        to_agent: str,
        message_type: str,
        classification: str,
        sanitized: bool = False
    ):
        """Log A2A transaction for audit trail"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "from": from_agent,
            "to": to_agent,
            "type": message_type,
            "classification": classification,
            "sanitized": sanitized
        }
        self.audit_log.append(log_entry)
        
        # In production, write to secure audit log file or database
        PrintStyle.info(
            f"[AUDIT] {from_agent} → {to_agent}: {message_type} "
            f"({classification}){' [SANITIZED]' if sanitized else ''}"
        )
    
    def get_audit_trail(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent audit trail entries"""
        return self.audit_log[-limit:]
    
    def secure_a2a_message(
        self,
        message: str,
        from_agent: str,
        to_agent: str,
        classification: str = "public",
        requester_clearance: str = "public"
    ) -> Optional[Dict[str, Any]]:
        """
        Complete secure A2A message preparation
        """
        # Check if data can be shared
        if not self.can_share_data(classification, requester_clearance):
            PrintStyle.warning(
                f"Access denied: {from_agent} lacks clearance for {classification} data"
            )
            self.log_transaction(
                from_agent, to_agent, "DENIED", classification
            )
            return None
        
        # Sanitize the message
        sanitized_message = self.sanitize_data(message, classification)
        
        # Log the transaction
        self.log_transaction(
            from_agent, to_agent, "MESSAGE", classification,
            sanitized=(sanitized_message != message)
        )
        
        # Prepare secure message
        secure_msg = {
            "content": sanitized_message,
            "classification": classification,
            "from": from_agent,
            "to": to_agent,
            "timestamp": datetime.now().isoformat(),
            "sanitized": sanitized_message != message
        }
        
        return secure_msg