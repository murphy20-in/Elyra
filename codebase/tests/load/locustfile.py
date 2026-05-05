"""
Locust load test for Elyra.
"""
import random
import uuid
import time
from locust import HttpUser, task, between, events
from locust.exception import StopUser

GENDERS = ["man", "woman", "non-binary", "genderqueer", "transgender"]
ORIENTATIONS = ["gay", "lesbian", "bisexual", "pansexual", "queer"]
INTENTS = ["exploring", "serious", "discreet", "friendship"]
CITIES = ["Mumbai", "Bangalore", "Delhi", "Pune", "Hyderabad", "Chennai"]

class ElyraUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://localhost"

    def on_start(self):
        ts = int(time.time() * 1000)
        rand = uuid.uuid4().hex[:6]
        email = f"load_{ts}_{rand}@load.elyra.app"
        register_payload = {
            "email": email,
            "password": "LoadTest123!",
            "display_name": f"Load User {rand}",
            "age": random.randint(20, 40),
            "gender_identity": random.choice(GENDERS),
            "sexual_orientation": random.choice(ORIENTATIONS),
            "intent": random.choice(INTENTS),
            "city": random.choice(CITIES),
            "bio": f"Load test user {rand}",
        }
        with self.client.post("/api/v1/auth/register", json=register_payload, catch_response=True) as resp:
            if resp.status_code in (200, 201):
                token = resp.json().get("access_token")
                self.auth_headers = {"Authorization": f"Bearer {token}"}
                resp.success()
            elif resp.status_code == 409:
                with self.client.post("/api/v1/auth/login", json={"email": email, "password": "LoadTest123!"}, catch_response=True) as lr:
                    if lr.status_code == 200:
                        token = lr.json().get("access_token")
                        self.auth_headers = {"Authorization": f"Bearer {token}"}
                        lr.success()
                    else:
                        lr.failure(f"Login failed: {lr.status_code}")
                        raise StopUser()
            else:
                resp.failure(f"Registration failed: {resp.status_code}")
                raise StopUser()

    @task(5)
    def discover(self):
        with self.client.get("/api/v1/matches/discover", headers=self.auth_headers, name="/api/v1/matches/discover", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Discover failed: {resp.status_code}")

    @task(2)
    def like_random_user(self):
        candidates = getattr(self, "_candidate_ids", [])
        if not candidates:
            return
        target = random.choice(candidates)
        with self.client.post(f"/api/v1/matches/{target}/like", headers=self.auth_headers, name="/api/v1/matches/[id]/like", catch_response=True) as resp:
            if resp.status_code in (200, 400, 404):
                resp.success()
            else:
                resp.failure(f"Like failed: {resp.status_code}")

    @task(3)
    def view_matches(self):
        with self.client.get("/api/v1/matches", headers=self.auth_headers, name="/api/v1/matches", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Matches failed: {resp.status_code}")

    @task(2)
    def view_chat_threads(self):
        with self.client.get("/api/v1/chat/threads", headers=self.auth_headers, name="/api/v1/chat/threads", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Chat threads failed: {resp.status_code}")

    @task(1)
    def view_own_profile(self):
        with self.client.get("/api/v1/profiles/me", headers=self.auth_headers, name="/api/v1/profiles/me", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Profile failed: {resp.status_code}")

    @task(1)
    def check_notifications(self):
        with self.client.get("/api/v1/notifications", headers=self.auth_headers, name="/api/v1/notifications", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Notifications failed: {resp.status_code}")


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    stats = environment.runner.stats
    discover_stats = stats.entries.get(("/api/v1/matches/discover", "GET"))
    if discover_stats:
        p95 = discover_stats.get_response_time_percentile(0.95)
        p50 = discover_stats.get_response_time_percentile(0.50)
        print(f"\n[SLO] /discover p50={p50:.0f}ms p95={p95:.0f}ms")
        if p95 > 500:
            environment.process_exit_code = 1
            print(f"[SLO] FAIL: p95={p95:.0f}ms exceeds 500ms")
        if p50 > 200:
            environment.process_exit_code = 1
            print(f"[SLO] FAIL: p50={p50:.0f}ms exceeds 200ms")