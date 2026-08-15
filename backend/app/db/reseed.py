"""Comprehensive reseed: refresh expired posts and add rich demo data.

Run:  cd backend && .venv/Scripts/python -m app.db.reseed
Or:   .venv/Scripts/python app/db/reseed.py

This script:
1. Refreshes all expired feed posts (extends expiry to 7 days from now)
2. Adds 15+ new feed posts across all categories
3. Adds 5 new providers across categories
4. Adds 8+ new requests across types
5. Adds reviews for all providers
6. Adds more conversations and messages
7. Creates booking requests
"""
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select, text, update

from app.core.security import hash_password
from app.db.session import async_session_factory, engine
from app.models.directory import ProviderProfile, Review
from app.models.feed import FeedPost
from app.models.messages import BookingRequest, Conversation, Message
from app.models.requests import Request, RequestReply
from app.models.user import Locality, User
from app.services.verification import recompute_verification


async def refresh_expired_posts():
    """Extend expiry on all expired posts to 7 days from now."""
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            update(FeedPost)
            .where(FeedPost.expires_at < now)
            .values(expires_at=now + timedelta(days=7))
        )
        await db.commit()
        print(f"  Refreshed {result.rowcount} expired posts")


async def add_feed_posts():
    """Add 15 new feed posts across all categories."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}
        localities = {l.name: l for l in (await db.scalars(select(Locality))).all()}

        # Get locality coordinates from lat/lng columns
        loc_coords = {}
        for name, loc in localities.items():
            loc_coords[name] = (loc.lat, loc.lng)

        now = datetime.now(timezone.utc)
        posts_data = [
            # Traffic
            ("rohan@localpulse.dev", "traffic", "Auto strike near Bandra station today. Cabs available but surge pricing. Plan extra 15 mins.", "Bandra West", False, 6, 5),
            ("priya@localpulse.dev", "traffic", "Accident near Western Express Highway — traffic backed up to Andheri. Use SV Road instead.", "Bandra East", False, 4, 3),
            ("sarah@localpulse.dev", "traffic", "Metro construction blocking one lane on Linking Road. Expect delays during peak hours.", "Bandra West", False, 12, 2),

            # Utility
            ("demo@localpulse.dev", "utility", "Electricity maintenance scheduled tomorrow 10 AM - 2 PM in Pali Hill area. Keep devices charged.", "Bandra West", False, 18, 8),
            ("arjun@localpulse.dev", "utility", "Water tanker coming to Carter Road at 6 AM tomorrow. Useful for those with low pressure.", "Bandra West", False, 24, 4),
            ("society@localpulse.dev", "utility", "Broadband outage in Hill Road area — ISP says it'll be fixed by evening.", "Bandra West", False, 8, 6),

            # Safety
            ("demo@localpulse.dev", "safety", "Stray dog pack spotted near Pali Hill park. Please keep children away and report any incidents.", "Bandra West", True, 12, 15),
            ("rohan@localpulse.dev", "safety", "Suspicious person seen checking car doors on Perry Cross Road last night. Park in well-lit areas.", "Bandra West", True, 24, 10),

            # Civic
            ("society@localpulse.dev", "civic", "Waste collection schedule changed — now every Tuesday and Friday. Keep bins out by 7 AM.", "Bandra West", False, 48, 7),
            ("society@localpulse.dev", "civic", "Community garden meeting this Saturday at 8 AM. We're planning the monsoon planting schedule.", "Bandra West", False, 72, 5),
            ("demo@localpulse.dev", "civic", "Free health checkup camp at Bandra Municipal School this Sunday 9 AM - 1 PM. BP, sugar, BMI.", "Bandra West", False, 96, 12),

            # Event
            ("priya@localpulse.dev", "event", "Garba night organized by Carter Road RWA this Thursday 7 PM. All neighbors welcome!", "Bandra West", False, 48, 20),
            ("sarah@localpulse.dev", "event", "Book exchange drive at Pali Hill community hall this Saturday. Bring books, take books!", "Bandra West", False, 72, 8),
            ("arjun@localpulse.dev", "event", "Morning yoga sessions starting next week at Pali Hill park. 6 AM daily, all levels welcome.", "Bandra West", False, 168, 6),

            # Other
            ("demo@localpulse.dev", "other", "Found a set of keys near Hill Road junction — silver keychain with a small elephant. DM me to claim.", "Bandra West", False, 24, 3),
        ]

        existing_count = (await db.scalar(select(FeedPost.id).limit(1))) is not None
        if not existing_count:
            print("  No posts found, skipping add")
            return

        added = 0
        for email, category, text_content, locality_name, urgent, hours, confirms in posts_data:
            author = users.get(email)
            loc = localities.get(locality_name)
            if author is None or loc is None:
                continue
            coords = loc_coords.get(locality_name)
            if coords is None:
                continue
            lat, lng = coords
            db.add(
                FeedPost(
                    user_id=author.id,
                    category=category,
                    text=text_content,
                    location=f"SRID=4326;POINT({lng} {lat})",
                    created_at=now - timedelta(hours=2),
                    expires_at=now + timedelta(hours=hours),
                    confirm_count=confirms,
                    urgent=urgent,
                )
            )
            added += 1

        await db.commit()
        print(f"  Added {added} new feed posts")


async def add_providers():
    """Add 5 new providers across categories."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}

        new_providers = [
            ("priya@localpulse.dev", "maid", "Deep cleaning & daily maid services", "₹300-500/session", "Mon-Sat 9 AM-1 PM", 5, 19.0554, 72.8326),
            ("sarah@localpulse.dev", "electrician", "Certified electrician — wiring, repairs, installations", "₹200-400/hr", "24/7 available", 8, 19.0621, 72.8264),
            ("rohan@localpulse.dev", "plumber", "Professional plumber — leaks, installations, drainage", "₹150-300/hr", "8 AM - 8 PM", 6, 19.0500, 72.8300),
            ("demo@localpulse.dev", "tutor", "English & Hindi tutor for school students", "₹300/hr", "Weekends 10 AM-4 PM", 4, 19.0621, 72.8264),
            ("society@localpulse.dev", "other", "Society maintenance help — carpentry, painting, minor repairs", "₹200-400/hr", "Mon-Sat 8 AM-6 PM", 3, 19.0554, 72.8326),
        ]

        added = 0
        for email, category, tagline, price, avail, area, lat, lng in new_providers:
            owner = users.get(email)
            if owner is None:
                continue
            # Check if already exists
            existing = await db.scalar(
                select(ProviderProfile).where(ProviderProfile.user_id == owner.id)
            )
            if existing:
                continue
            db.add(
                ProviderProfile(
                    user_id=owner.id,
                    category=category,
                    tagline=tagline,
                    price_range=price,
                    availability=avail,
                    service_area_km=area,
                    location=f"SRID=4326;POINT({lng} {lat})",
                )
            )
            added += 1

        await db.flush()

        # Recompute verification for all providers
        profiles = (await db.scalars(select(ProviderProfile))).all()
        for profile in profiles:
            await recompute_verification(db, profile.id)

        await db.commit()
        print(f"  Added {added} new providers (total: {len(profiles)})")


async def add_reviews():
    """Add reviews for providers that don't have enough."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}
        profiles = (await db.scalars(select(ProviderProfile))).all()

        new_reviews = [
            # Reviews for new providers
            ("provider@localpulse.dev", "arjun@localpulse.dev", 5, "Amazing cook! Tried the south Indian thali — restaurant quality at home."),
            ("provider@localpulse.dev", "sarah@localpulse.dev", 4, "Good food, slightly salty for my taste but overall excellent."),

            ("priya@localpulse.dev", "demo@localpulse.dev", 5, "Priya does an amazing deep clean. My house sparkles every time!"),
            ("priya@localpulse.dev", "rohan@localpulse.dev", 5, "Reliable and thorough. Been using her services for 3 months now."),
            ("priya@localpulse.dev", "arjun@localpulse.dev", 4, "Very professional. Arrives on time and does a great job."),

            ("sarah@localpulse.dev", "demo@localpulse.dev", 5, "Fixed my wiring issue in 30 minutes. Fair pricing too!"),
            ("sarah@localpulse.dev", "rohan@localpulse.dev", 4, "Good work on the ceiling fan installation. Would recommend."),

            ("rohan@localpulse.dev", "demo@localpulse.dev", 5, "Fixed a leaky pipe at 11 PM. Lifesaver!"),
            ("rohan@localpulse.dev", "sarah@localpulse.dev", 4, "Professional and quick. Used for bathroom renovation."),

            ("demo@localpulse.dev", "priya@localpulse.dev", 5, "Great English tutor! My daughter's grades improved significantly."),
            ("demo@localpulse.dev", "arjun@localpulse.dev", 4, "Patient teacher. Explains concepts very clearly."),

            # More reviews for original cook
            ("provider@localpulse.dev", "priya@localpulse.dev", 5, "The butter chicken was incredible. Best home delivery in Bandra!"),
            ("provider@localpulse.dev", "arjun@localpulse.dev", 5, "Ramesh catered for my birthday party. Everyone loved the food!"),
        ]

        # Get existing review pairs to avoid duplicates
        existing = set()
        for profile in profiles:
            reviews = (await db.scalars(
                select(Review).where(Review.provider_id == profile.id)
            )).all()
            for rev in reviews:
                existing.add((profile.user_id, rev.reviewer_id))

        added = 0
        for owner_email, reviewer_email, rating, text_content in new_reviews:
            owner = users.get(owner_email)
            reviewer = users.get(reviewer_email)
            if not owner or not reviewer:
                continue
            profile = next((p for p in profiles if p.user_id == owner.id), None)
            if not profile:
                continue
            if (profile.user_id, reviewer.id) in existing:
                continue
            db.add(Review(provider_id=profile.id, reviewer_id=reviewer.id, rating=rating, text=text_content))
            existing.add((profile.user_id, reviewer.id))
            added += 1

        # Recompute verification
        for profile in profiles:
            await recompute_verification(db, profile.id)

        await db.commit()
        print(f"  Added {added} new reviews")


async def add_requests():
    """Add 8 new requests across all types."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}

        requests_data = [
            ("demo@localpulse.dev", "borrow_lend", "Need a pressure washer for cleaning the balcony. Will return same day.", 19.0554, 72.8326, 24, [
                ("rohan@localpulse.dev", "I have a Karcher one. Lives on Hill Road. Can pick up anytime after 5 PM.")
            ]),
            ("priya@localpulse.dev", "ride_share", "Going to airport tomorrow 4 AM. Anyone need a ride from Bandra? Can fit 2 more.", 19.0621, 72.8264, 8, [
                ("sarah@localpulse.dev", "I need to be at T2 by 5:30 AM. Can I join?")
            ]),
            ("arjun@localpulse.dev", "spare_item", "Extra tickets for Coldplay concert next Saturday. Face value only.", 19.0500, 72.8300, 120, [
                ("demo@localpulse.dev", " interested! DM me the details."),
                ("priya@localpulse.dev", "How many tickets? Looking for 2.")
            ]),
            ("rohan@localpulse.dev", "borrow_lend", "Looking for a power drill for the weekend. Just need it for 2-3 hours.", 19.0621, 72.8264, 48, [
                ("demo@localpulse.dev", "I have a Bosch drill. Happy to lend. Ping me.")
            ]),
            ("sarah@localpulse.dev", "other", "Looking for a reliable home tutor for my son (Class 8 Math). Any recommendations?", 19.0554, 72.8326, 168, []),
            ("arjun@localpulse.dev", "ride_share", "Anyone heading to Pune this weekend? Happy to share fuel costs.", 19.0621, 72.8264, 72, [
                ("rohan@localpulse.dev", "I'm going Saturday morning. We can carpool!")
            ]),
            ("demo@localpulse.dev", "spare_item", "Selling my old iPhone 13 — works perfectly, just upgraded. ₹35,000.", 19.0554, 72.8326, 168, []),
            ("priya@localpulse.dev", "borrow_lend", "Need a ladder to clean AC filters on the 2nd floor. 8ft should do.", 19.0500, 72.8300, 6, [
                ("arjun@localpulse.dev", "I have a telescoping ladder. Can bring it over tomorrow morning.")
            ]),
        ]

        now = datetime.now(timezone.utc)
        added = 0
        for email, req_type, text_content, lat, lng, hours, replies in requests_data:
            requester = users.get(email)
            if requester is None:
                continue
            req = Request(
                user_id=requester.id,
                type=req_type,
                text=text_content,
                location=f"SRID=4326;POINT({lng} {lat})",
                needed_by=now + timedelta(hours=hours),
                created_at=now - timedelta(minutes=30),
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
                        created_at=now - timedelta(minutes=15),
                    )
                )
            added += 1

        await db.commit()
        print(f"  Added {added} new requests with replies")


async def add_messages():
    """Add more conversations and messages."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}

        conversations_data = [
            ("demo@localpulse.dev", "arjun@localpulse.dev", [
                ("demo@localpulse.dev", "Hey Arjun! I saw your tutor listing. Do you teach Class 10 science?"),
                ("arjun@localpulse.dev", "Yes! I cover Physics, Chemistry, and Biology. When do you want to start?"),
                ("demo@localpulse.dev", "Next week would be great. How about Tuesdays and Thursdays?"),
                ("arjun@localpulse.dev", "Perfect! I'm free 5-7 PM on those days. Let's start with a trial session."),
            ]),
            ("demo@localpulse.dev", "priya@localpulse.dev", [
                ("demo@localpulse.dev", "Hi Priya! Do you do deep cleaning for 2BHK apartments?"),
                ("priya@localpulse.dev", "Yes! I charge ₹800 for a standard 2BHK. Includes kitchen and bathrooms."),
                ("demo@localpulse.dev", "Sounds good. Can you come this Saturday morning?"),
                ("priya@localpulse.dev", "Saturday 9 AM works! I'll bring all supplies. See you then!"),
            ]),
            ("demo@localpulse.dev", "sarah@localpulse.dev", [
                ("demo@localpulse.dev", "Sarah, I have a ceiling fan that's making noise. Can you check it?"),
                ("sarah@localpulse.dev", "Of course! It's usually the bearings. I can come tomorrow evening."),
                ("demo@localpulse.dev", "Perfect. What's your charge?"),
                ("sarah@localpulse.dev", "₹200 for inspection, ₹400 if bearings need replacing. I'll confirm after checking."),
            ]),
        ]

        now = datetime.now(timezone.utc)
        conv_count = 0
        msg_count = 0

        for email_a, email_b, messages in conversations_data:
            user_a = users.get(email_a)
            user_b = users.get(email_b)
            if not user_a or not user_b:
                continue

            # Check if conversation exists
            a_id, b_id = (user_a.id, user_b.id) if str(user_a.id) < str(user_b.id) else (user_b.id, user_a.id)
            existing = await db.scalar(
                select(Conversation).where(
                    Conversation.user_a_id == a_id,
                    Conversation.user_b_id == b_id,
                )
            )
            if existing:
                continue

            conv = Conversation(user_a_id=a_id, user_b_id=b_id)
            db.add(conv)
            await db.flush()
            conv_count += 1

            for i, (sender_email, body) in enumerate(messages):
                sender = users.get(sender_email)
                if sender:
                    db.add(
                        Message(
                            conversation_id=conv.id,
                            sender_id=sender.id,
                            body=body,
                            created_at=now - timedelta(minutes=(len(messages) - i) * 10),
                        )
                    )
                    msg_count += 1

            conv.last_message_at = now - timedelta(minutes=10)

        # Add booking requests
        ramesh = users.get("provider@localpulse.dev")
        demo = users.get("demo@localpulse.dev")
        if ramesh and demo:
            profile = await db.scalar(
                select(ProviderProfile).where(ProviderProfile.user_id == ramesh.id)
            )
            if profile:
                existing_booking = await db.scalar(
                    select(BookingRequest).where(
                        BookingRequest.customer_id == demo.id,
                        BookingRequest.provider_id == profile.id,
                    )
                )
                if not existing_booking:
                    db.add(
                        BookingRequest(
                            provider_id=profile.id,
                            customer_id=demo.id,
                            message="Hi Ramesh, can you cook for a family of 4 this weekend? Lunch on Sunday if possible.",
                            created_at=now - timedelta(hours=2),
                        )
                    )

        await db.commit()
        print(f"  Added {conv_count} conversations, {msg_count} messages")


async def main():
    print("🔄 Starting comprehensive reseed...")
    print()

    print("1️⃣  Refreshing expired posts...")
    await refresh_expired_posts()

    print("2️⃣  Adding new feed posts...")
    await add_feed_posts()

    print("3️⃣  Adding new providers...")
    await add_providers()

    print("4️⃣  Adding new reviews...")
    await add_reviews()

    print("5️⃣  Adding new requests...")
    await add_requests()

    print("6️⃣  Adding conversations and messages...")
    await add_messages()

    print()
    print("✅ Reseed complete!")
    print()

    # Print summary
    async with async_session_factory() as db:
        post_count = (await db.scalar(select(FeedPost.id).limit(1))) is not None
        if post_count:
            count = (await db.execute(text("SELECT COUNT(*) FROM feed_posts WHERE expires_at > NOW()"))).scalar()
            print(f"  📰 Active feed posts: {count}")

        prov_count = (await db.execute(text("SELECT COUNT(*) FROM provider_profiles"))).scalar()
        print(f"  🔧 Total providers: {prov_count}")

        rev_count = (await db.execute(text("SELECT COUNT(*) FROM reviews"))).scalar()
        print(f"  ⭐ Total reviews: {rev_count}")

        req_count = (await db.execute(text("SELECT COUNT(*) FROM requests"))).scalar()
        print(f"  🤝 Total requests: {req_count}")

        msg_count = (await db.execute(text("SELECT COUNT(*) FROM messages"))).scalar()
        print(f"  💬 Total messages: {msg_count}")

        conv_count = (await db.execute(text("SELECT COUNT(*) FROM conversations"))).scalar()
        print(f"  📱 Total conversations: {conv_count}")


if __name__ == "__main__":
    asyncio.run(main())
