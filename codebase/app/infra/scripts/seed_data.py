#!/usr/bin/env python3
"""
Seed script for development/testing.
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))

from datetime import datetime, timedelta
import uuid
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    {"email": "alex@test.elyra.app",    "display_name": "Alex",    "age": 26, "gender_identity": "non-binary",     "sexual_orientation": "pansexual",  "intent": "exploring",  "city": "Mumbai",    "bio": "Coffee lover and hiking enthusiast."},
    {"email": "priya@test.elyra.app",   "display_name": "Priya",   "age": 24, "gender_identity": "woman",           "sexual_orientation": "bisexual",   "intent": "serious",    "city": "Bangalore", "bio": "Software engineer, cat parent."},
    {"email": "rohan@test.elyra.app",   "display_name": "Rohan",   "age": 28, "gender_identity": "man",             "sexual_orientation": "gay",        "intent": "friendship", "city": "Delhi",     "bio": "Artist and filmmaker."},
    {"email": "sam@test.elyra.app",     "display_name": "Sam",     "age": 22, "gender_identity": "genderqueer",     "sexual_orientation": "queer",      "intent": "exploring",  "city": "Pune",      "bio": "Bookworm and amateur baker."},
    {"email": "diya@test.elyra.app",    "display_name": "Diya",    "age": 30, "gender_identity": "woman",           "sexual_orientation": "lesbian",    "intent": "serious",    "city": "Hyderabad", "bio": "Doctor by day, dancer by night."},
    {"email": "arjun@test.elyra.app",   "display_name": "Arjun",   "age": 25, "gender_identity": "man",             "sexual_orientation": "bisexual",   "intent": "discreet",   "city": "Chennai",   "bio": "Travel addict, foodie."},
    {"email": "zara@test.elyra.app",    "display_name": "Zara",    "age": 27, "gender_identity": "transgender",     "sexual_orientation": "pansexual",  "intent": "exploring",  "city": "Kolkata",   "bio": "Musician and poet."},
    {"email": "kai@test.elyra.app",     "display_name": "Kai",     "age": 23, "gender_identity": "agender",         "sexual_orientation": "asexual",    "intent": "friendship", "city": "Mumbai",    "bio": "Game dev and tabletop RPG fan."},
    {"email": "meera@test.elyra.app",   "display_name": "Meera",   "age": 29, "gender_identity": "woman",           "sexual_orientation": "queer",      "intent": "serious",    "city": "Bangalore", "bio": "NGO worker, bookclub organiser."},
    {"email": "nikhil@test.elyra.app",  "display_name": "Nikhil",  "age": 31, "gender_identity": "man",             "sexual_orientation": "gay",        "intent": "exploring",  "city": "Delhi",     "bio": "Chef and food blogger."},
]

MATCH_PAIRS = [(0, 1), (2, 3), (4, 5), (6, 7), (8, 9)]

SEED_MESSAGES = [
    [{"sender_idx": 0, "content": "Hey! Saw you're in Mumbai too 👋"}, {"sender_idx": 1, "content": "Hi Alex! Yes, Bandra area 😊"}, {"sender_idx": 0, "content": "Nice! I'm in Andheri. Any good café recommendations?"}],
    [{"sender_idx": 2, "content": "Love your bio — what kind of books?"}, {"sender_idx": 3, "content": "Mostly queer fiction + sci-fi! You?"}],
    [{"sender_idx": 4, "content": "Fellow foodie here 🍛 any Hyderabad biryani recs?"}],
]


async def seed():
    from app.backend.core.config import settings
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from app.backend.models.user import User
    from app.backend.models.profile import PublicProfile
    from app.backend.models.match import Match
    from app.backend.models.chat import ChatThread

    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
    messages_collection = mongo_client[settings.MONGO_DB]["messages"]

    user_ids = []

    async with async_session() as session:
        print("Seeding users and profiles...")
        for i, u in enumerate(USERS):
            user = User(
                email=u["email"],
                password_hash=pwd_context.hash("TestPass123!"),
                is_active=True,
                email_verified=True,
            )
            session.add(user)
            await session.flush()

            profile = PublicProfile(
                user_id=user.id,
                display_name=u["display_name"],
                age=u["age"],
                gender_identity=u["gender_identity"],
                sexual_orientation=u["sexual_orientation"],
                intent=u["intent"],
                city=u["city"],
                bio=u["bio"],
                is_visible=True,
                photos=[],
            )
            session.add(profile)
            user_ids.append(user.id)
            print(f"  Created user: {u['email']}")

        await session.flush()

        print("Seeding matches and threads...")
        thread_data = []
        for pair_idx, (i, j) in enumerate(MATCH_PAIRS):
            uid1, uid2 = user_ids[i], user_ids[j]
            lo, hi = (uid1, uid2) if str(uid1) < str(uid2) else (uid2, uid1)
            match = Match(user_id_1=lo, user_id_2=hi, status="matched", matched_at=datetime.utcnow())
            session.add(match)
            await session.flush()

            if pair_idx < 3:
                thread = ChatThread(
                    match_id=match.id,
                    participant_1=uid1,
                    participant_2=uid2,
                    is_anonymous=False,
                    last_message_at=datetime.utcnow() - timedelta(minutes=pair_idx * 10),
                )
                session.add(thread)
                await session.flush()
                thread_data.append((thread.id, uid1, uid2))
                print(f"  Created match+thread: {USERS[i]['display_name']} ↔ {USERS[j]['display_name']}")
            else:
                print(f"  Created match: {USERS[i]['display_name']} ↔ {USERS[j]['display_name']}")

        await session.commit()

        print("Seeding messages (MongoDB)...")
        for t_idx, (thread_id, uid1, uid2) in enumerate(thread_data):
            msgs = SEED_MESSAGES[t_idx]
            pair = MATCH_PAIRS[t_idx]
            for m_idx, msg in enumerate(msgs):
                sender_id = user_ids[pair[0]] if msg["sender_idx"] == pair[0] else user_ids[pair[1]]
                doc = {
                    "thread_id": str(thread_id),
                    "sender_id": str(sender_id),
                    "content": msg["content"],
                    "message_type": "text",
                    "client_message_id": f"seed-{t_idx}-{m_idx}",
                    "is_moderated": False,
                    "moderation_result": None,
                    "is_deleted": False,
                    "read_by": [],
                    "metadata": {},
                    "created_at": datetime.utcnow() - timedelta(minutes=len(msgs) - m_idx),
                    "updated_at": datetime.utcnow(),
                }
                await messages_collection.insert_one(doc)
            print(f"  Inserted {len(msgs)} messages for thread {t_idx + 1}")

    print("\n✅ Seed complete!")
    print(f"   {len(USERS)} users created (password: TestPass123!)")
    print(f"   {len(MATCH_PAIRS)} matches created")
    print(f"   3 chat threads with messages")
    print("\nTest logins:")
    for u in USERS[:3]:
        print(f"   {u['email']} / TestPass123!")

    mongo_client.close()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())