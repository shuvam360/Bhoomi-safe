"""
BhoomiSafe — Rate Limiter Module
=================================
Centralized SlowAPI limiter instance keyed on remote client IP address.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize limiter keyed on client IP address
limiter = Limiter(key_func=get_remote_address, default_limits=[])
