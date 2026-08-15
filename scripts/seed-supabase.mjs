/**
 * LocalPulse — dev seed for Supabase.
 *
 * Creates demo auth users (via the admin API) and demo content (posts,
 * requests, providers, a DM thread, a booking). Requires:
 *   SUPABASE_URL            — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard (Settings → API)
 *
 * The service-role key is used ONLY here, inside a developer-run script.
 * It must never be shipped to the browser.
 *
 * Run:  npm run seed:supabase   (from frontend/)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Tiny .env loader (frontend/.env) so the script works with npm run.
try {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* no .env file — rely on environment variables */
}

// frontend/.env carries the URL as VITE_SUPABASE_URL (see .env.example); the
// plain SUPABASE_URL name is accepted as a fallback for CI/terminal use.
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Copy frontend/.env.example → frontend/.env and fill them in, or export them.");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_PASSWORD = "password123";

const DEMO_USERS = [
  { email: "demo@localpulse.dev", full_name: "Demo Resident", role: "individual", phone: "9999000011" },
  { email: "provider@localpulse.dev", full_name: "Ramesh Kumar", role: "business", phone: "9999000022" },
  { email: "society@localpulse.dev", full_name: "Carter Road RWA", role: "community", phone: "9999000033" },
  { email: "admin@localpulse.dev", full_name: "LocalPulse Admin", role: "admin", phone: "9999000099" },
  // Requested default admin — admin@gmail.com / admin@1234 (dev only).
  { email: "admin@gmail.com", full_name: "Admin User", role: "admin", phone: "9999000001", password: "admin@1234" },
  // Extra neighbours so reviews/replies come from distinct people.
  { email: "priya@localpulse.dev", full_name: "Priya Nair", role: "individual", phone: "9999000044" },
  { email: "arjun@localpulse.dev", full_name: "Arjun K.", role: "individual", phone: "9999000055" },
  { email: "sarah@localpulse.dev", full_name: "Sarah M.", role: "individual", phone: "9999000066" },
  { email: "rohan@localpulse.dev", full_name: "Rohan D.", role: "individual", phone: "9999000077" },
];

const log = (msg) => console.log(`· ${msg}`);
const warn = (msg) => console.warn(`⚠ ${msg}`);

async function ensureUser({ email, full_name, role, phone, password }) {
  const { data: existing } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    // Make sure the profile role matches (admin/community accounts are
    // provisioned this way — public signup can never self-select them).
    await sb.from("profiles").update({ role }).eq("id", found.id);
    log(`user ${email} exists (role ensured: ${role})`);
    return found.id;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: password ?? DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name, phone, role },
  });
  if (error) throw error;
  // Public-signup trigger forces individual/business; fix role for demo accounts.
  await sb.from("profiles").update({ role }).eq("id", data.user.id);
  log(`created ${email} (${role})`);
  return data.user.id;
}

async function localityId(name) {
  const { data } = await sb.from("localities").select("id").eq("name", name).maybeSingle();
  return data?.id ?? null;
}

async function main() {
  log("Seeding users…");
  const ids = {};
  for (const u of DEMO_USERS) {
    ids[u.email] = await ensureUser(u);
  }

  const bandra = await localityId("Bandra West");
  if (!bandra) warn("Locality 'Bandra West' not found — run migrations 0001–0004 first.");
  await sb.from("profiles").update({ locality_id: bandra }).in("id", Object.values(ids));

  // ---- feed posts ----------------------------------------------------------
  const { data: posts } = await sb.from("feed_posts").select("id").limit(1);
  if (!posts || posts.length === 0) {
    log("Seeding feed posts…");
    const now = new Date();
    const h = (n) => new Date(now.getTime() + n * 3_600_000).toISOString();
    const mk = (email, category, text, lat, lng, urgent, hours, confirms) => ({
      user_id: ids[email], category, text, lat, lng,
      created_at: new Date(now.getTime() - (hours / 2) * 3_600_000).toISOString(),
      expires_at: h(hours), confirm_count: confirms, urgent,
    });
    await sb.from("feed_posts").insert([
      mk("demo@localpulse.dev", "utility", "Water supply disruption — emergency pipeline repair near Carter Road. Supply cut for ~4 hours, please store water.", 19.0554, 72.8326, true, 4, 12),
      mk("society@localpulse.dev", "civic", "Road resurfacing on Perry Cross Road tonight 11 PM – 5 AM. Expect diversions, avoid street parking.", 19.0621, 72.8264, false, 12, 6),
      mk("society@localpulse.dev", "traffic", "Heavy congestion near Hill Road junction after a minor accident — take the service road if you can.", 19.05, 72.83, true, 6, 9),
      mk("demo@localpulse.dev", "event", "Sunday morning community garden meetup at Pali Hill park, 7 AM. Bring gloves — seed bombs are ready!", 19.0621, 72.8264, false, 24, 4),
    ]);
  }

  // ---- providers + reviews ------------------------------------------------
  const { data: providers } = await sb.from("provider_profiles").select("id").limit(1);
  if (!providers || providers.length === 0) {
    log("Seeding providers + reviews…");
    const { data: cook } = await sb.from("provider_profiles").insert({
      user_id: ids["provider@localpulse.dev"], category: "cook",
      tagline: "Expert cook • North & South Indian", price_range: "₹150–₹250 / meal",
      availability: "Weekdays 1–4 PM", service_area_km: 3, lat: 19.0554, lng: 72.8326,
    }).select("id").single();
    const { data: tutor } = await sb.from("provider_profiles").insert({
      user_id: ids["arjun@localpulse.dev"], category: "tutor",
      tagline: "Math & Science tutor • Grades 6–10", price_range: "₹400 / hr",
      availability: "Evenings 5–8 PM", service_area_km: 5, lat: 19.0621, lng: 72.8264,
    }).select("id").single();

    const reviews = [
      [cook.id, "demo@localpulse.dev", 5, "Ramesh has cooked for our family for months — dal makhani is incredible and he's always on time."],
      [cook.id, "society@localpulse.dev", 5, "Reliable, hygienic, and flexible with timings. Several society members now use him."],
      [cook.id, "priya@localpulse.dev", 5, "Made a week's worth of meal prep look easy. Great portions and fair prices."],
      [cook.id, "sarah@localpulse.dev", 4, "Very good food and clean kitchen. Slightly late once, but always communicates."],
      [cook.id, "rohan@localpulse.dev", 5, "Best home cook in the area — highly recommend the south Indian thali."],
      [tutor.id, "priya@localpulse.dev", 5, "My son's math grades improved a lot. Patient and explains concepts clearly."],
      [tutor.id, "rohan@localpulse.dev", 4, "Good tutor, structured lessons. Works well with distracted teens."],
    ];
    await sb.from("reviews").insert(reviews.map(([provider_id, email, rating, text]) => ({
      provider_id, reviewer_id: ids[email], rating, text,
    })));
    log("verification counts recomputed by trigger");
  }

  // ---- requests + replies -------------------------------------------------
  const { data: requests } = await sb.from("requests").select("id").limit(1);
  if (!requests || requests.length === 0) {
    log("Seeding requests…");
    const now = new Date();
    const req1 = await sb.from("requests").insert({
      user_id: ids["rohan@localpulse.dev"], type: "ride_share",
      text: "Anyone going to the airport at 5 AM? My ride cancelled last minute, flight at 7 AM, one carry-on. Happy to chip in for gas or buy coffee!",
      lat: 19.0554, lng: 72.8326, needed_by: new Date(now.getTime() + 5 * 3_600_000).toISOString(),
    }).select("id").single();
    const req2 = await sb.from("requests").insert({
      user_id: ids["demo@localpulse.dev"], type: "borrow_lend",
      text: "Tall ladder needed for 1 hour — clearing leaves from the first-floor balcony drain before tonight's rain. 10ft+ if possible.",
      lat: 19.0621, lng: 72.8264, needed_by: new Date(now.getTime() + 6 * 3_600_000).toISOString(),
    }).select("id").single();
    await sb.from("requests").insert({
      user_id: ids["sarah@localpulse.dev"], type: "spare_item",
      text: "Extra ticket for Saturday's evening show at the community hall — a friend backed out. Free to a neighbor, first come first served.",
      lat: 19.0554, lng: 72.8326, needed_by: new Date(now.getTime() + 30 * 3_600_000).toISOString(),
    });

    await sb.from("request_replies").insert([
      { request_id: req1.data.id, user_id: ids["sarah@localpulse.dev"], message: "I work near there and have an early shift — could swing by at 5:15 if that works?" },
      { request_id: req2.data.id, user_id: ids["arjun@localpulse.dev"], message: "I have a 12ft ladder, happy to lend it. Ping me on the society group." },
    ]);
  }

  // ---- DM thread + booking -------------------------------------------------
  const { data: conversations } = await sb.from("conversations").select("id").limit(1);
  if (!conversations || conversations.length === 0) {
    log("Seeding a DM thread + booking…");
    const demo = ids["demo@localpulse.dev"];
    const ramesh = ids["provider@localpulse.dev"];
    const { data: conv } = await sb
      .from("conversations")
      .insert({ user_a_id: demo, user_b_id: ramesh })
      .select("id")
      .single();
    await sb.from("messages").insert([
      { conversation_id: conv.id, sender_id: demo, body: "Hi Ramesh! Do you cook for families of four?" },
      { conversation_id: conv.id, sender_id: demo, body: "Perfect — could you do a lunch trial this Saturday?" },
      { conversation_id: conv.id, sender_id: ramesh, body: "Absolutely! I'm free Saturday morning — shall we say 11 AM?" },
    ]);
    const { data: cook } = await sb
      .from("provider_profiles").select("id").eq("user_id", ramesh).maybeSingle();
    if (cook) {
      await sb.from("booking_requests").insert({
        provider_id: cook.id, customer_id: demo,
        message: "Hi Ramesh, can you cook for a family of 4 this weekend? Lunch on Sunday if possible.",
      });
    }
  }

  console.log("\n✅ Seed complete.");
  console.log(`Demo accounts (default password "${DEMO_PASSWORD}" unless listed):`);
  for (const u of DEMO_USERS.slice(0, 5)) {
    const pw = u.password ?? DEMO_PASSWORD;
    console.log(`   ${u.email.padEnd(26)} ${u.role.padEnd(10)} ${u.full_name}  →  ${pw}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
