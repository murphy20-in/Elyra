import re
from typing import Optional

IMMEDIATE_BLOCK_PATTERNS = [
    r'\bchild\s*(porn|sex|nude|naked)\b',
    r'\bcp\b.*\b(send|share|want|need)\b',
    r'\b(i will|i\'m going to|gonna)\s+(kill|murder|rape|hurt)\s+(you|him|her|them)\b',
    r'\b(dm|text|whatsapp|telegram)\s+me\s+(for|to)\b',
    r'\bsnap(chat)?\s*:\s*\w+\b',
]

HIGH_RISK_PATTERNS = [
    r'\b(slut|whore|faggot|dyke|tranny)\b',
    r'\b(kys|kill yourself)\b',
    r'\bsend\s+(nudes?|pics?|photos?)\b',
    r'\b(escort|hookup|nsa)\b',
    r'https?://\S+',
]

DISPOSABLE_EMAIL_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
    'yopmail.com', 'trashmail.com', '10minutemail.com', 'maildrop.cc',
    'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
    'spam4.me', 'fakeinbox.com', 'dispostable.com', 'mailnull.com',
    'spamgourmet.com', 'spoofmail.de', 'discardmail.com',
}

SPAM_BIO_PATTERNS = [
    r'\b(follow me on|find me on|add me on)\s+(instagram|snap|tg|telegram)\b',
    r'\bdm\s+for\s+(fun|rates|content|collab)\b',
    r'onlyfans\.com',
    r'\b(sugar\s*daddy|sugar\s*baby|arrangements?)\b',
]


def check_immediate_block(text: str) -> Optional[str]:
    text_lower = text.lower()
    for pattern in IMMEDIATE_BLOCK_PATTERNS:
        if re.search(pattern, text_lower):
            return pattern
    return None


def check_high_risk(text: str) -> list[str]:
    text_lower = text.lower()
    matched = []
    for pattern in HIGH_RISK_PATTERNS:
        if re.search(pattern, text_lower):
            matched.append(pattern)
    return matched


def is_disposable_email(email: str) -> bool:
    domain = email.split('@')[-1].lower() if '@' in email else ''
    return domain in DISPOSABLE_EMAIL_DOMAINS


def check_spam_bio(text: str) -> list[str]:
    text_lower = text.lower()
    return [p for p in SPAM_BIO_PATTERNS if re.search(p, text_lower)]