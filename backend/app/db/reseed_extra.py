"""Extra variety seed: adds more diverse demo data for a richer experience.

Run:  cd backend && .venv/Scripts/python -m app.db.reseed_extra
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, text

from app.db.session import async_session_factory
from app.models.directory import ProviderProfile, Review
from app.models.feed import FeedPost
from app.models.requests import Request, RequestReply
from app.models.user import Locality, User
from app.services.verification import recompute_verification


async def add_variety_posts():
    """Add 10 more diverse feed posts."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}
        localities = {l.name: l for l in (await db.scalars(select(Locality))).all()}

        now = datetime.now(timezone.utc)
        posts_data = [
            # More diverse traffic posts
            ("arjun@localpulse.dev", "traffic", "School zone speed cameras active on Perry Cross Road. Fine is ₹2000 for overspeeding.", "Bandra West", False, 72, 3),

            # More safety posts
            ("sarah@localpulse.dev", "safety", "Power cut in the entire Hill Road area. BEST says it'll be restored by 4 PM.", "Bandra West", True, 6, 8),
            ("rohan@localpulse.dev", "safety", "Firecracker shop opened near the school. Keep children away from that area.", "Bandra West", False, 48, 4),

            # More utility posts
            ("demo@localpulse.dev", "utility", "Gas agency delivery tomorrow 10 AM - 1 PM. Keep cylinders outside.", "Bandra West", False, 24, 6),
            ("priya@localpulse.dev", "utility", "Tree trimming work on Linking Road tomorrow. Expect traffic diversions.", "Bandra West", False, 18, 2),

            # More civic posts
            ("society@localpulse.dev", "civic", "Annual general meeting of Carter Road RWA next Sunday 10 AM. All members must attend.", "Bandra West", False, 168, 15),
            ("society@localpulse.dev", "civic", "New recycling bins installed near the park. Please use them for plastic and paper.", "Bandra West", False, 96, 4),

            # More event posts
            ("demo@localpulse.dev", "event", "Morning walk group meets daily at 6:30 AM near Pali Hill park gate. All welcome!", "Bandra West", False, 240, 9),
            ("rohan@localpulse.dev", "event", "Local band performing at Carter Road tonight 7 PM. Free entry for neighbors!", "Bandra West", False, 12, 18),

            # More other posts
            ("priya@localpulse.dev", "other", "Free puppies for adoption at the Carter Road shelter. 6 weeks old, vaccinated.", "Bandra West", False, 72, 7),
        ]

        added = 0
        for email, category, text_content, locality_name, urgent, hours, confirms in posts_data:
            author = users.get(email)
            loc = localities.get(locality_name)
            if author is None or loc is None:
                continue
            db.add(
                FeedPost(
                    user_id=author.id,
                    category=category,
                    text=text_content,
                    location=f"SRID=4326;POINT({loc.lng} {loc.lat})",
                    created_at=now - timedelta(hours=1),
                    expires_at=now + timedelta(hours=hours),
                    confirm_count=confirms,
                    urgent=urgent,
                )
            )
            added += 1

        await db.commit()
        print(f"  Added {added} variety posts")


async def add_variety_providers():
    """Add 3 more providers for variety."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}

        new_providers = [
            ("sarah@localpulse.dev", "cook", "South Indian specialist — dosas, idlis, sambar", "₹100-200/meal", "Weekdays 11 AM-2 PM", 4, 19.0621, 72.8264),
            ("arjun@localpulse.dev", "dog_walker", "Professional dog walker — trained with large breeds", "₹300/walk", "Daily 6-8 AM & 5-7 PM", 3, 19.0554, 72.8326),
            ("rohan@localpulse.dev", "other", "Handyman services — furniture assembly, wall mounting, minor repairs", "₹150-300/hr", "Mon-Sat 9 AM-6 PM", 5, 19.0500, 72.8300),
        ]

        added = 0
        for email, category, tagline, price, avail, area, lat, lng in new_providers:
            owner = users.get(email)
            if owner is None:
                continue
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

        # Recompute verification
        profiles = (await db.scalars(select(ProviderProfile))).all()
        for profile in profiles:
            await recompute_verification(db, profile.id)

        await db.commit()
        print(f"  Added {added} variety providers (total: {len(profiles)})")


async def add_variety_requests():
    """Add 5 more diverse requests."""
    async with async_session_factory() as db:
        users = {u.email: u for u in (await db.scalars(select(User))).all()}

        requests_data = [
            ("demo@localpulse.dev", "other", "Looking for a reliable plumber to fix bathroom tiles. Will pay hourly.", 19.0554, 72.8326, 72, [
                ("rohan@localpulse.dev", "I'm a plumber! Can come tomorrow morning. ₹200/hr.")
            ]),
            ("arjun@localpulse.dev", "borrow_lend", "Need a car seat for a 2-year-old for a weekend trip. Will return Monday.", 19.0621, 72.8264, 48, []),
            ("priya@localpulse.dev", "spare_item", "Selling unused gym equipment — dumbbells (5kg pair), yoga mat, resistance bands. ₹2000 total.", 19.0500, 72.8300, 168, [
                ("demo@localpulse.dev", " interested in the yoga mat. Can I buy just that?")
            ]),
            ("sarah@localpulse.dev", "ride_share", "Need a ride to Navi Mumbai tomorrow afternoon. Will share fuel costs.", 19.0554, 72.8326, 24, []),
            ("rohan@localpulse.dev", "borrow_lend", "Anyone have a sewing machine I can borrow for a day? Need to hem some curtains.", 19.0621, 72.8264, 48, [
                ("priya@localpulse.dev", "I have a Singer machine! Happy to lend. DM me.")
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
                created_at=now - timedelta(minutes=20),
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
                        created_at=now - timedelta(minutes=10),
                    )
                )
            added += 1

        await db.commit()
        print(f"  Added {added} variety requests")


async def main():
    print("🌈 Adding extra variety to demo data...")
    print()

    print("1️⃣  Adding variety posts...")
    await add_variety_posts()

    print("2️⃣  Adding variety providers...")
    await add_variety_providers()

    print("3️⃣  Adding variety requests...")
    await add_variety_requests()

    print()
    print("✅ Extra variety added!")

    # Print summary
    async with async_session_factory() as db:
        post_count = (await db.execute(text("SELECT COUNT(*) FROM feed_posts WHERE expires_at > NOW()"))).scalar()
        print(f"  📰 Active feed posts: {post_count}")

        prov_count = (await db.execute(text("SELECT COUNT(*) FROM provider_profiles"))).scalar()
        print(f"  🔧 Total providers: {prov_count}")

        rev_count = (await db.execute(text("SELECT COUNT(*) FROM reviews"))).scalar()
        print(f"  ⭐ Total reviews: {rev_count}")

        req_count = (await db.execute(text("SELECT COUNT(*) FROM requests"))).scalar()
        print(f"  🤝 Total requests: {req_count}")


if __name__ == "__main__":
    asyncio.run(main())
