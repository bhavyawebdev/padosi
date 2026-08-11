"""Idempotent dev seed: localities + demo accounts.

Run manually:  .venv/Scripts/python -m app.db.seed
Also invoked automatically on startup in development (see app.main lifespan).
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.directory import ProviderProfile, Review
from app.models.feed import FeedPost
from app.models.messages import BookingRequest, Conversation, Message
from app.models.requests import Request, RequestReply
from app.models.user import Locality, User
from app.services.verification import recompute_verification

# (name, city, state, lat, lng) — the platform is city-agnostic: localities
# across many Indian cities/states so any neighbourhood can join, not just Mumbai.
INDIA_LOCALITIES = [
    # ---- Maharashtra · Mumbai (original anchor set) ----
    ("Bandra West", "Mumbai", "Maharashtra", 19.0554, 72.8326),
    ("Bandra East", "Mumbai", "Maharashtra", 19.0646, 72.8407),
    ("Khar West", "Mumbai", "Maharashtra", 19.0716, 72.8273),
    ("Santacruz West", "Mumbai", "Maharashtra", 19.0816, 72.8375),
    ("Juhu", "Mumbai", "Maharashtra", 19.1075, 72.8263),
    ("Andheri West", "Mumbai", "Maharashtra", 19.1364, 72.8266),
    ("Powai", "Mumbai", "Maharashtra", 19.1176, 72.9060),
    ("Worli", "Mumbai", "Maharashtra", 19.0019, 72.8165),
    ("Lower Parel", "Mumbai", "Maharashtra", 18.9948, 72.8251),
    ("Pali Hill, Bandra", "Mumbai", "Maharashtra", 19.0621, 72.8264),
    ("Colaba", "Mumbai", "Maharashtra", 18.9076, 72.8186),
    ("Malabar Hill", "Mumbai", "Maharashtra", 18.9508, 72.8036),
    ("Dadar", "Mumbai", "Maharashtra", 19.0178, 72.8478),
    ("Chembur", "Mumbai", "Maharashtra", 19.0481, 72.8963),
    ("Vashi, Navi Mumbai", "Navi Mumbai", "Maharashtra", 19.0760, 73.0056),
    ("Thane West", "Thane", "Maharashtra", 19.2183, 72.9781),
    # ---- Maharashtra · Pune ----
    ("Koregaon Park", "Pune", "Maharashtra", 18.5362, 73.8940),
    ("Kothrud", "Pune", "Maharashtra", 18.5074, 73.8077),
    ("Viman Nagar", "Pune", "Maharashtra", 18.5679, 73.9143),
    ("Baner", "Pune", "Maharashtra", 18.5591, 73.7867),
    ("Hinjewadi", "Pune", "Maharashtra", 18.5913, 73.7389),
    # ---- Maharashtra · Nagpur ----
    ("Dharampeth", "Nagpur", "Maharashtra", 21.1469, 79.0879),
    ("Civil Lines", "Nagpur", "Maharashtra", 21.1536, 79.0848),
    # ---- Delhi ----
    ("Lajpat Nagar", "Delhi", "Delhi", 28.5677, 77.2427),
    ("Greater Kailash", "Delhi", "Delhi", 28.5471, 77.2417),
    ("Saket", "Delhi", "Delhi", 28.5255, 77.2064),
    ("Hauz Khas", "Delhi", "Delhi", 28.5494, 77.2000),
    ("Dwarka", "Delhi", "Delhi", 28.5921, 77.0460),
    ("Rohini", "Delhi", "Delhi", 28.7334, 77.1147),
    ("Karol Bagh", "Delhi", "Delhi", 28.6519, 77.1907),
    ("Chandni Chowk", "Delhi", "Delhi", 28.6511, 77.2299),
    ("Vasant Kunj", "Delhi", "Delhi", 28.5239, 77.1564),
    # ---- Haryana · Gurugram ----
    ("DLF Phase 1", "Gurugram", "Haryana", 28.4797, 77.0934),
    ("Sector 29", "Gurugram", "Haryana", 28.4674, 77.0491),
    ("Golf Course Road", "Gurugram", "Haryana", 28.4496, 77.0984),
    ("Sushant Lok", "Gurugram", "Haryana", 28.4728, 77.0830),
    ("Sector 14, Gurugram", "Gurugram", "Haryana", 28.4762, 77.0412),
    # ---- Uttar Pradesh · Noida ----
    ("Sector 62", "Noida", "Uttar Pradesh", 28.6264, 77.3661),
    ("Sector 18", "Noida", "Uttar Pradesh", 28.5708, 77.3248),
    ("Greater Noida West", "Greater Noida", "Uttar Pradesh", 28.4744, 77.5030),
    ("Indirapuram", "Ghaziabad", "Uttar Pradesh", 28.6435, 77.3701),
    # ---- Karnataka · Bengaluru ----
    ("Indiranagar", "Bengaluru", "Karnataka", 12.9719, 77.6412),
    ("Koramangala", "Bengaluru", "Karnataka", 12.9352, 77.6245),
    ("Whitefield", "Bengaluru", "Karnataka", 12.9698, 77.7500),
    ("HSR Layout", "Bengaluru", "Karnataka", 12.9116, 77.6407),
    ("Jayanagar", "Bengaluru", "Karnataka", 12.9250, 77.5938),
    ("Malleshwaram", "Bengaluru", "Karnataka", 13.0033, 77.5670),
    ("Marathahalli", "Bengaluru", "Karnataka", 12.9591, 77.6974),
    ("Electronic City", "Bengaluru", "Karnataka", 12.8452, 77.6602),
    ("Yelahanka", "Bengaluru", "Karnataka", 13.1000, 77.5960),
    # ---- Telangana · Hyderabad ----
    ("Banjara Hills", "Hyderabad", "Telangana", 17.4140, 78.4420),
    ("Jubilee Hills", "Hyderabad", "Telangana", 17.4318, 78.4105),
    ("Gachibowli", "Hyderabad", "Telangana", 17.4401, 78.3489),
    ("Hitech City", "Hyderabad", "Telangana", 17.4435, 78.3772),
    ("Madhapur", "Hyderabad", "Telangana", 17.4483, 78.3915),
    ("Secunderabad", "Hyderabad", "Telangana", 17.4399, 78.4983),
    ("Kukatpally", "Hyderabad", "Telangana", 17.4948, 78.4000),
    # ---- Tamil Nadu · Chennai ----
    ("Adyar", "Chennai", "Tamil Nadu", 13.0012, 80.2565),
    ("T. Nagar", "Chennai", "Tamil Nadu", 13.0418, 80.2341),
    ("Anna Nagar", "Chennai", "Tamil Nadu", 13.0850, 80.2101),
    ("Velachery", "Chennai", "Tamil Nadu", 12.9787, 80.2189),
    ("Mylapore", "Chennai", "Tamil Nadu", 13.0330, 80.2700),
    ("Besant Nagar", "Chennai", "Tamil Nadu", 12.9987, 80.2660),
    ("Guindy", "Chennai", "Tamil Nadu", 13.0067, 80.2207),
    ("OMR Corridor", "Chennai", "Tamil Nadu", 12.9330, 80.2400),
    # ---- West Bengal · Kolkata ----
    ("Salt Lake", "Kolkata", "West Bengal", 22.5843, 88.4108),
    ("Ballygunge", "Kolkata", "West Bengal", 22.5333, 88.3639),
    ("Park Street", "Kolkata", "West Bengal", 22.5524, 88.3533),
    ("New Town", "Kolkata", "West Bengal", 22.5800, 88.4800),
    # ---- Gujarat ----
    ("Navrangpura", "Ahmedabad", "Gujarat", 23.0320, 72.5580),
    ("Satellite", "Ahmedabad", "Gujarat", 23.0200, 72.5200),
    ("Bopal", "Ahmedabad", "Gujarat", 23.0500, 72.4700),
    ("Maninagar", "Ahmedabad", "Gujarat", 23.0040, 72.6000),
    ("Vesu", "Surat", "Gujarat", 21.1300, 72.7700),
    ("Adajan", "Surat", "Gujarat", 21.1800, 72.7900),
    # ---- Rajasthan · Jaipur ----
    ("Malviya Nagar", "Jaipur", "Rajasthan", 26.8560, 75.8110),
    ("C-Scheme", "Jaipur", "Rajasthan", 26.9030, 75.7980),
    ("Vaishali Nagar", "Jaipur", "Rajasthan", 26.8950, 75.7300),
    ("Mansarovar", "Jaipur", "Rajasthan", 26.8540, 75.7640),
    # ---- Uttar Pradesh · Lucknow ----
    ("Gomti Nagar", "Lucknow", "Uttar Pradesh", 26.8560, 80.9970),
    ("Hazratganj", "Lucknow", "Uttar Pradesh", 26.8550, 80.9400),
    ("Aliganj", "Lucknow", "Uttar Pradesh", 26.8930, 80.9330),
    # ---- Chandigarh / Punjab ----
    ("Sector 17", "Chandigarh", "Chandigarh", 30.7388, 76.7788),
    ("Sector 22", "Chandigarh", "Chandigarh", 30.7330, 76.7700),
    ("Sector 35", "Chandigarh", "Chandigarh", 30.7130, 76.7700),
    ("Mohali", "Mohali", "Punjab", 30.7040, 76.7180),
    # ---- Kerala · Kochi ----
    ("Kakkanad", "Kochi", "Kerala", 10.0159, 76.3419),
    ("Ernakulam", "Kochi", "Kerala", 9.9816, 76.2999),
    ("Fort Kochi", "Kochi", "Kerala", 9.9659, 76.2426),
    # ---- Goa ----
    ("Panjim", "Panaji", "Goa", 15.4909, 73.8278),
    ("Mapusa", "Mapusa", "Goa", 15.5900, 73.8100),
    ("Margao", "Margao", "Goa", 15.2830, 73.9860),
    # ---- Madhya Pradesh · Indore ----
    ("Vijay Nagar", "Indore", "Madhya Pradesh", 22.7400, 75.8950),
    ("Palasia", "Indore", "Madhya Pradesh", 22.7160, 75.8830),
    # ---- Bihar · Patna ----
    ("Boring Road", "Patna", "Bihar", 25.6100, 85.1400),
    ("Kankarbagh", "Patna", "Bihar", 25.5900, 85.1700),
    # ---- Odisha · Bhubaneswar ----
    ("Saheed Nagar", "Bhubaneswar", "Odisha", 20.2870, 85.8360),
    ("Jayadev Vihar", "Bhubaneswar", "Odisha", 20.3160, 85.8260),
    # ---- Assam · Guwahati ----
    ("Uzan Bazar", "Guwahati", "Assam", 26.1830, 91.7450),
    ("Ganeshguri", "Guwahati", "Assam", 26.1500, 91.8000),
]

DEMO_USERS = [
    ("demo@localpulse.dev", "Demo Resident", "individual", "Bandra West", "9999000011"),
    ("provider@localpulse.dev", "Ramesh Kumar", "business", "Bandra West", "9999000022"),
    ("society@localpulse.dev", "Carter Road RWA", "community", "Bandra West", "9999000033"),
    ("admin@localpulse.dev", "LocalPulse Admin", "admin", "Bandra West", "9999000099"),
]

# All demo accounts share this password (dev only).
DEMO_PASSWORD = "password123"


DEMO_NEIGHBORS = [
    ("priya@localpulse.dev", "Priya Nair", "9999000044"),
    ("arjun@localpulse.dev", "Arjun K.", "9999000055"),
    ("sarah@localpulse.dev", "Sarah M.", "9999000066"),
    ("rohan@localpulse.dev", "Rohan D.", "9999000077"),
]

DEMO_PROVIDERS = [
    # (owner_email, category, tagline, price_range, availability, service_area_km, lat, lng)
    ("provider@localpulse.dev", "cook", "Expert cook • North & South Indian", "₹150–₹250 / meal", "Weekdays 1–4 PM", 3, 19.0554, 72.8326),
    ("arjun@localpulse.dev", "tutor", "Math & Science tutor • Grades 6–10", "₹400 / hr", "Evenings 5–8 PM", 5, 19.0621, 72.8264),
]

DEMO_REVIEWS = [
    # (provider_owner_email, reviewer_email, rating, text)
    ("provider@localpulse.dev", "demo@localpulse.dev", 5, "Ramesh has cooked for our family for months — dal makhani is incredible and he's always on time."),
    ("provider@localpulse.dev", "society@localpulse.dev", 5, "Reliable, hygienic, and flexible with timings. Several society members now use him."),
    ("provider@localpulse.dev", "priya@localpulse.dev", 5, "Made a week's worth of meal prep look easy. Great portions and fair prices."),
    ("provider@localpulse.dev", "sarah@localpulse.dev", 4, "Very good food and clean kitchen. Slightly late once, but always communicates."),
    ("provider@localpulse.dev", "rohan@localpulse.dev", 5, "Best home cook in the area — highly recommend the south Indian thali."),
    ("arjun@localpulse.dev", "priya@localpulse.dev", 5, "My son's math grades improved a lot. Patient and explains concepts clearly."),
    ("arjun@localpulse.dev", "rohan@localpulse.dev", 4, "Good tutor, structured lessons. Works well with distracted teens."),
]


DEMO_FEED_POSTS = [
    # (author_email, category, text, lat, lng, urgent, expires_in_hours, confirms)
    ("demo@localpulse.dev", "utility", "Water supply disruption — emergency pipeline repair near Carter Road. Supply cut for ~4 hours, please store water.", 19.0554, 72.8326, True, 4, 12),
    ("society@localpulse.dev", "civic", "Road resurfacing on Perry Cross Road tonight 11 PM – 5 AM. Expect diversions, avoid street parking.", 19.0621, 72.8264, False, 12, 6),
    ("society@localpulse.dev", "traffic", "Heavy congestion near Hill Road junction after a minor accident — take the service road if you can.", 19.0500, 72.8300, True, 6, 9),
    ("demo@localpulse.dev", "event", "Sunday morning community garden meetup at Pali Hill park, 7 AM. Bring gloves — seed bombs are ready!", 19.0621, 72.8264, False, 24, 4),
]


async def seed_feed_posts() -> None:
    async with async_session_factory() as db:
        if (await db.scalar(select(FeedPost.id).limit(1))) is not None:
            return
        users = {u.email: u for u in (await db.scalars(select(User))).all()}
        now = datetime.now(timezone.utc)
        for email, category, text, lat, lng, urgent, hours, confirms in DEMO_FEED_POSTS:
            author = users.get(email)
            if author is None:
                continue
            db.add(
                FeedPost(
                    user_id=author.id,
                    category=category,
                    text=text,
                    location=f"SRID=4326;POINT({lng} {lat})",
                    created_at=now - timedelta(hours=hours // 2),
                    expires_at=now + timedelta(hours=hours),
                    confirm_count=confirms,
                    urgent=urgent,
                )
            )
        await db.commit()


async def seed_providers() -> None:
    async with async_session_factory() as db:
        if (await db.scalar(select(ProviderProfile.id).limit(1))) is not None:
            return
        users = {u.email: u for u in (await db.scalars(select(User))).all()}

        # Extra neighbor accounts so reviews come from distinct people.
        existing_emails = set(users.keys())
        for email, full_name, phone in DEMO_NEIGHBORS:
            if email in existing_emails:
                continue
            db.add(
                User(
                    email=email,
                    password_hash=hash_password(DEMO_PASSWORD),
                    full_name=full_name,
                    role="individual",
                    phone=phone,
                    phone_verified=True,
                )
            )
        await db.flush()
        users = {u.email: u for u in (await db.scalars(select(User))).all()}

        provider_ids: dict[str, ProviderProfile] = {}
        for owner_email, category, tagline, price, avail, area, lat, lng in DEMO_PROVIDERS:
            owner = users.get(owner_email)
            if owner is None:
                continue
            profile = ProviderProfile(
                user_id=owner.id,
                category=category,
                tagline=tagline,
                price_range=price,
                availability=avail,
                service_area_km=area,
                location=f"SRID=4326;POINT({lng} {lat})",
            )
            db.add(profile)
            provider_ids[owner_email] = profile
        await db.flush()

        for owner_email, reviewer_email, rating, text in DEMO_REVIEWS:
            profile = provider_ids.get(owner_email)
            reviewer = users.get(reviewer_email)
            if profile is None or reviewer is None or reviewer.id == profile.user_id:
                continue
            db.add(Review(provider_id=profile.id, reviewer_id=reviewer.id, rating=rating, text=text))
        await db.flush()

        for profile in provider_ids.values():
            await recompute_verification(db, profile.id)
        await db.commit()


DEMO_REQUESTS = [
    # (requester_email, type, text, lat, lng, needed_in_hours, replies)
    ("rohan@localpulse.dev", "ride_share", "Anyone going to the airport at 5 AM? My ride cancelled last minute, flight at 7 AM, one carry-on. Happy to chip in for gas or buy coffee!", 19.0554, 72.8326, 5, [("sarah@localpulse.dev", "I work near there and have an early shift — could swing by at 5:15 if that works?")]),
    ("demo@localpulse.dev", "borrow_lend", "Tall ladder needed for 1 hour — clearing leaves from the first-floor balcony drain before tonight's rain. 10ft+ if possible.", 19.0621, 72.8264, 6, [("arjun@localpulse.dev", "I have a 12ft ladder, happy to lend it. Ping me on the society group.")]),
    ("sarah@localpulse.dev", "spare_item", "Extra ticket for Saturday's evening show at the community hall — a friend backed out. Free to a neighbor, first come first served.", 19.0554, 72.8326, 30, []),
]


async def seed_requests() -> None:
    async with async_session_factory() as db:
        if (await db.scalar(select(Request.id).limit(1))) is not None:
            return
        users = {u.email: u for u in (await db.scalars(select(User))).all()}
        now = datetime.now(timezone.utc)
        for email, req_type, text, lat, lng, hours, replies in DEMO_REQUESTS:
            requester = users.get(email)
            if requester is None:
                continue
            req = Request(
                user_id=requester.id,
                type=req_type,
                text=text,
                location=f"SRID=4326;POINT({lng} {lat})",
                needed_by=now + timedelta(hours=hours),
                created_at=now - timedelta(minutes=40),
            )
            db.add(req)
            await db.flush()
            for replyer_email, message in replies:
                replyer = users.get(replyer_email)
                if replyer is None:
                    continue
                db.add(
                    RequestReply(
                        request_id=req.id,
                        user_id=replyer.id,
                        message=message,
                        created_at=now - timedelta(minutes=20),
                    )
                )
        await db.commit()


async def seed_messages() -> None:
    """A demo DM thread + an open booking request so the inbox isn't empty."""
    async with async_session_factory() as db:
        if (await db.scalar(select(Conversation.id).limit(1))) is not None:
            return
        users = {u.email: u for u in (await db.scalars(select(User))).all()}
        demo = users.get("demo@localpulse.dev")
        ramesh = users.get("provider@localpulse.dev")
        if demo is None or ramesh is None:
            return

        # 1) A conversation between the demo resident and Ramesh (the cook).
        a, b = (demo.id, ramesh.id) if str(demo.id) < str(ramesh.id) else (ramesh.id, demo.id)
        conv = Conversation(user_a_id=a, user_b_id=b)
        db.add(conv)
        await db.flush()
        now = datetime.now(timezone.utc)
        demo_messages = [
            "Hi Ramesh! Do you cook for families of four?",
            "Perfect — could you do a lunch trial this Saturday?",
        ]
        for i, body in enumerate(demo_messages):
            db.add(
                Message(
                    conversation_id=conv.id,
                    sender_id=demo.id,
                    body=body,
                    created_at=now - timedelta(minutes=45 - i * 15),
                )
            )
        db.add(
            Message(
                conversation_id=conv.id,
                sender_id=ramesh.id,
                body="Absolutely! I'm free Saturday morning — shall we say 11 AM?",
                created_at=now - timedelta(minutes=20),
            )
        )
        conv.last_message_at = now - timedelta(minutes=20)

        # 2) An open booking request from the demo resident to Ramesh.
        profile = await db.scalar(select(ProviderProfile).where(ProviderProfile.user_id == ramesh.id))
        if profile is not None:
            db.add(
                BookingRequest(
                    provider_id=profile.id,
                    customer_id=demo.id,
                    message="Hi Ramesh, can you cook for a family of 4 this weekend? Lunch on Sunday if possible.",
                    created_at=now - timedelta(hours=2),
                )
            )
        await db.commit()


async def seed_demo_data() -> None:
    await seed_users_and_localities()
    await seed_feed_posts()
    await seed_providers()
    await seed_requests()
    await seed_messages()


async def seed_users_and_localities() -> None:
    async with async_session_factory() as db:
        existing_names = set((await db.scalars(select(Locality.name))).all())
        for name, city, state, lat, lng in INDIA_LOCALITIES:
            if name not in existing_names:
                db.add(Locality(name=name, city=city, state=state, lat=lat, lng=lng))
        await db.flush()

        existing_emails = set((await db.scalars(select(User.email))).all())
        locality_by_name = {
            loc.name: loc for loc in (await db.scalars(select(Locality))).all()
        }
        for email, full_name, role, locality_name, phone in DEMO_USERS:
            if email in existing_emails:
                continue
            locality = locality_by_name.get(locality_name)
            db.add(
                User(
                    email=email,
                    password_hash=hash_password(DEMO_PASSWORD),
                    full_name=full_name,
                    role=role,
                    phone=phone,
                    phone_verified=True,
                    govt_id_verified=(role in ("business", "admin")),
                    locality_id=locality.id if locality else None,
                )
            )
        await db.commit()


async def main() -> None:
    await seed_demo_data()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
