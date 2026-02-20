import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service-level access to seed data
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // ============================================================
    // 1. Create the trip
    // ============================================================
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        name: "Tennessee Adventure 2026",
        destination: "Tennessee, USA",
        start_date: "2026-06-12",
        end_date: "2026-06-14",
        creator_email: "sarah.mitchell@email.com",
        invite_code: "TNDEMO26",
        total_budget: 3000,
      })
      .select()
      .single();

    if (tripError) {
      return NextResponse.json({ error: "Trip: " + tripError.message }, { status: 500 });
    }

    const tripId = trip.id;

    // ============================================================
    // 2. Create 3 participants
    // ============================================================
    const { data: participants, error: partError } = await supabase
      .from("participants")
      .insert([
        {
          trip_id: tripId,
          first_name: "Sarah",
          last_name: "Mitchell",
          email: "sarah.mitchell@email.com",
          is_organizer: true,
        },
        {
          trip_id: tripId,
          first_name: "Jake",
          last_name: "Rodriguez",
          email: "jake.rod@email.com",
          is_organizer: false,
        },
        {
          trip_id: tripId,
          first_name: "Emily",
          last_name: "Chen",
          email: "emily.chen@email.com",
          is_organizer: false,
        },
      ])
      .select();

    if (partError) {
      return NextResponse.json({ error: "Participants: " + partError.message }, { status: 500 });
    }

    const sarah = participants[0];
    const jake = participants[1];
    const emily = participants[2];

    // ============================================================
    // 3. Create cards — mix of booked, chosen, hot contender, idea
    // ============================================================
    const cardData = [
      // ---- DAY 1: June 12 — Nashville ----
      {
        trip_id: tripId,
        type: "lodging",
        title: "Downtown Nashville Airbnb",
        description:
          "Gorgeous 2BR loft in The Gulch, walking distance to Broadway. Has a rooftop view of the city skyline! Host has 4.9 stars with 200+ reviews.",
        date: "2026-06-12",
        start_time: "15:00",
        duration_minutes: 1440,
        location: "The Gulch, Nashville",
        address: "408 Houston St, Nashville, TN 37203",
        budget: 450,
        category: "accommodation",
        stage: "booked",
        is_multi_day: true,
        end_date: "2026-06-14",
        created_by: sarah.id,
        sort_order: 0,
      },
      {
        trip_id: tripId,
        type: "restaurant",
        title: "Hattie B's Hot Chicken",
        description:
          "THE hot chicken spot in Nashville. We HAVE to go here. Get there early — the line gets insane after noon. I'd recommend 'Medium' heat unless you want to suffer.",
        date: "2026-06-12",
        start_time: "11:30",
        duration_minutes: 75,
        location: "Midtown Nashville",
        address: "112 19th Ave S, Nashville, TN 37203",
        budget: 75,
        category: "food",
        stage: "booked",
        created_by: jake.id,
        sort_order: 1,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Country Music Hall of Fame",
        description:
          "Massive museum with exhibits on Johnny Cash, Dolly Parton, Taylor Swift and more. Could easily spend 2-3 hours here.",
        date: "2026-06-12",
        start_time: "14:00",
        duration_minutes: 150,
        location: "Downtown Nashville",
        address: "222 Rep. John Lewis Way S, Nashville, TN 37203",
        budget: 90,
        category: "entertainment",
        stage: "hot_contender",
        created_by: emily.id,
        sort_order: 2,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Broadway Honky Tonk Tour",
        description:
          "Hit up the legendary honky tonks on Lower Broadway — Tootsie's, Robert's Western World, and The Stage. Free live music everywhere, just pay for drinks!",
        date: "2026-06-12",
        start_time: "19:00",
        duration_minutes: 180,
        location: "Lower Broadway, Nashville",
        address: "Lower Broadway, Nashville, TN",
        budget: 60,
        category: "nightlife",
        stage: "chosen",
        created_by: sarah.id,
        sort_order: 3,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Ryman Auditorium Tour",
        description:
          "The 'Mother Church of Country Music.' Self-guided tour of the historic venue. Cool backstage access option too.",
        date: "2026-06-12",
        start_time: "13:00",
        duration_minutes: 90,
        location: "Downtown Nashville",
        address: "116 Rep. John Lewis Way N, Nashville, TN 37219",
        budget: 60,
        category: "entertainment",
        stage: "idea",
        created_by: emily.id,
        sort_order: 4,
      },

      // ---- DAY 2: June 13 — Dollywood / Pigeon Forge ----
      {
        trip_id: tripId,
        type: "event",
        title: "Dollywood Theme Park",
        description:
          "Full day at Dollywood! Roller coasters (Lightning Rod is INSANE), Dolly's museum, craft village, and amazing cinnamon bread. This is a must-do. Park opens at 9, let's be there at gate open.",
        date: "2026-06-13",
        start_time: "09:00",
        duration_minutes: 600,
        location: "Pigeon Forge",
        address: "2700 Dollywood Parks Blvd, Pigeon Forge, TN 37863",
        budget: 450,
        category: "entertainment",
        stage: "booked",
        created_by: sarah.id,
        sort_order: 0,
      },
      {
        trip_id: tripId,
        type: "restaurant",
        title: "The Old Mill Restaurant",
        description:
          "Historic restaurant right by a working grist mill. Southern comfort food — fried chicken, corn chowder, homemade bread. Super cozy atmosphere. Reservations recommended!",
        date: "2026-06-13",
        start_time: "19:00",
        duration_minutes: 90,
        location: "Pigeon Forge",
        address: "164 Old Mill Ave, Pigeon Forge, TN 37863",
        budget: 90,
        category: "food",
        stage: "chosen",
        created_by: jake.id,
        sort_order: 1,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Dollywood Splash Country",
        description:
          "Water park next to Dollywood. Could be fun if it's super hot. Separate admission though.",
        date: "2026-06-13",
        start_time: "14:00",
        duration_minutes: 240,
        location: "Pigeon Forge",
        address: "2700 Dollywood Parks Blvd, Pigeon Forge, TN 37863",
        budget: 150,
        category: "entertainment",
        stage: "idea",
        created_by: jake.id,
        sort_order: 2,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Ripley's Aquarium of the Smokies",
        description:
          "Huge aquarium in Gatlinburg. Has a shark tunnel and penguin exhibit. Could be a good rainy day backup.",
        date: "2026-06-13",
        start_time: "12:00",
        duration_minutes: 120,
        location: "Gatlinburg",
        address: "88 River Rd, Gatlinburg, TN 37738",
        budget: 120,
        category: "entertainment",
        stage: "idea",
        created_by: emily.id,
        sort_order: 3,
      },

      // ---- DAY 3: June 14 — Smoky Mountains ----
      {
        trip_id: tripId,
        type: "restaurant",
        title: "Pancake Pantry Breakfast",
        description:
          "Legendary breakfast spot in Gatlinburg. 24 varieties of pancakes! The line moves fast. Their Austrian Apple Walnut pancakes are unreal.",
        date: "2026-06-14",
        start_time: "08:00",
        duration_minutes: 60,
        location: "Gatlinburg",
        address: "628 Parkway, Gatlinburg, TN 37738",
        budget: 60,
        category: "food",
        stage: "chosen",
        created_by: emily.id,
        sort_order: 0,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Clingmans Dome Summit Hike",
        description:
          "Highest point in Tennessee! It's a steep but short paved trail (0.5 miles) to a stunning 360° observation tower. On a clear day you can see 7 states. Get there early to avoid crowds.",
        date: "2026-06-14",
        start_time: "10:00",
        duration_minutes: 120,
        location: "Great Smoky Mountains National Park",
        address: "Clingmans Dome Rd, Bryson City, NC 28713",
        budget: 0,
        category: "outdoor",
        stage: "booked",
        created_by: sarah.id,
        sort_order: 1,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Gatlinburg SkyLift Park",
        description:
          "Chairlift ride up the mountain + the SkyBridge (longest pedestrian suspension bridge in North America!). Great views. Could do this after the hike.",
        date: "2026-06-14",
        start_time: "14:00",
        duration_minutes: 90,
        location: "Gatlinburg",
        address: "765 Parkway, Gatlinburg, TN 37738",
        budget: 90,
        category: "entertainment",
        stage: "hot_contender",
        created_by: jake.id,
        sort_order: 2,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Sugarlands Visitor Center",
        description:
          "Free visitor center at the park entrance. Has a nature museum, short films, and ranger info for trail suggestions.",
        date: "2026-06-14",
        start_time: "09:30",
        duration_minutes: 45,
        location: "Great Smoky Mountains",
        address: "1420 Fighting Creek Gap Rd, Gatlinburg, TN 37738",
        budget: 0,
        category: "outdoor",
        stage: "idea",
        created_by: emily.id,
        sort_order: 3,
      },

      // ---- UNASSIGNED IDEAS (no date) ----
      {
        trip_id: tripId,
        type: "activity",
        title: "Pigeon Forge Go-Karts",
        description: "The Track has multi-level go-kart tracks. Could be fun after Dollywood if we have energy left!",
        date: null,
        start_time: null,
        duration_minutes: 60,
        location: "Pigeon Forge",
        address: "2575 Parkway, Pigeon Forge, TN 37863",
        budget: 45,
        category: "entertainment",
        stage: "idea",
        created_by: jake.id,
        sort_order: 0,
      },
      {
        trip_id: tripId,
        type: "activity",
        title: "Jack Daniel's Distillery Tour",
        description:
          "The famous distillery in Lynchburg. It's about 1.5hrs from Nashville though, so might be tough to fit in. Worth it if we have time!",
        date: null,
        start_time: null,
        duration_minutes: 120,
        location: "Lynchburg, TN",
        address: "133 Lynchburg Hwy, Lynchburg, TN 37352",
        budget: 60,
        category: "entertainment",
        stage: "idea",
        created_by: sarah.id,
        sort_order: 1,
      },
    ];

    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .insert(cardData)
      .select();

    if (cardsError) {
      return NextResponse.json({ error: "Cards: " + cardsError.message }, { status: 500 });
    }

    // Build a lookup by title for easy reference
    const card: Record<string, { id: string }> = {};
    for (const c of cards) {
      card[c.title] = c;
    }

    // ============================================================
    // 4. Card participants — who's going to what
    // ============================================================
    const cardParticipants = [
      // Airbnb — everyone
      { card_id: card["Downtown Nashville Airbnb"].id, participant_id: sarah.id },
      { card_id: card["Downtown Nashville Airbnb"].id, participant_id: jake.id },
      { card_id: card["Downtown Nashville Airbnb"].id, participant_id: emily.id },
      // Hattie B's — everyone
      { card_id: card["Hattie B's Hot Chicken"].id, participant_id: sarah.id },
      { card_id: card["Hattie B's Hot Chicken"].id, participant_id: jake.id },
      { card_id: card["Hattie B's Hot Chicken"].id, participant_id: emily.id },
      // Broadway — everyone
      { card_id: card["Broadway Honky Tonk Tour"].id, participant_id: sarah.id },
      { card_id: card["Broadway Honky Tonk Tour"].id, participant_id: jake.id },
      { card_id: card["Broadway Honky Tonk Tour"].id, participant_id: emily.id },
      // Dollywood — everyone
      { card_id: card["Dollywood Theme Park"].id, participant_id: sarah.id },
      { card_id: card["Dollywood Theme Park"].id, participant_id: jake.id },
      { card_id: card["Dollywood Theme Park"].id, participant_id: emily.id },
      // Old Mill — everyone
      { card_id: card["The Old Mill Restaurant"].id, participant_id: sarah.id },
      { card_id: card["The Old Mill Restaurant"].id, participant_id: jake.id },
      { card_id: card["The Old Mill Restaurant"].id, participant_id: emily.id },
      // Pancake Pantry — everyone
      { card_id: card["Pancake Pantry Breakfast"].id, participant_id: sarah.id },
      { card_id: card["Pancake Pantry Breakfast"].id, participant_id: jake.id },
      { card_id: card["Pancake Pantry Breakfast"].id, participant_id: emily.id },
      // Clingmans Dome — everyone
      { card_id: card["Clingmans Dome Summit Hike"].id, participant_id: sarah.id },
      { card_id: card["Clingmans Dome Summit Hike"].id, participant_id: jake.id },
      { card_id: card["Clingmans Dome Summit Hike"].id, participant_id: emily.id },
      // Country Music Hall of Fame — Sarah & Emily interested
      { card_id: card["Country Music Hall of Fame"].id, participant_id: sarah.id },
      { card_id: card["Country Music Hall of Fame"].id, participant_id: emily.id },
      // SkyLift — Jake & Emily interested
      { card_id: card["Gatlinburg SkyLift Park"].id, participant_id: jake.id },
      { card_id: card["Gatlinburg SkyLift Park"].id, participant_id: emily.id },
    ];

    const { error: cpError } = await supabase.from("card_participants").insert(cardParticipants);
    if (cpError) {
      return NextResponse.json({ error: "CardParticipants: " + cpError.message }, { status: 500 });
    }

    // ============================================================
    // 5. Votes — realistic voting that shows why things were chosen
    // ============================================================
    const votes = [
      // Hattie B's — unanimous love (avg 3.0)
      { card_id: card["Hattie B's Hot Chicken"].id, participant_id: sarah.id, score: 3 },
      { card_id: card["Hattie B's Hot Chicken"].id, participant_id: jake.id, score: 3 },
      { card_id: card["Hattie B's Hot Chicken"].id, participant_id: emily.id, score: 3 },

      // Broadway Honky Tonks — strong yes (avg 2.67)
      { card_id: card["Broadway Honky Tonk Tour"].id, participant_id: sarah.id, score: 3 },
      { card_id: card["Broadway Honky Tonk Tour"].id, participant_id: jake.id, score: 3 },
      { card_id: card["Broadway Honky Tonk Tour"].id, participant_id: emily.id, score: 2 },

      // Country Music HoF — mixed (avg 2.0) — hence hot_contender
      { card_id: card["Country Music Hall of Fame"].id, participant_id: sarah.id, score: 2 },
      { card_id: card["Country Music Hall of Fame"].id, participant_id: jake.id, score: 1 },
      { card_id: card["Country Music Hall of Fame"].id, participant_id: emily.id, score: 3 },

      // Ryman — low interest (avg 1.33)
      { card_id: card["Ryman Auditorium Tour"].id, participant_id: sarah.id, score: 1 },
      { card_id: card["Ryman Auditorium Tour"].id, participant_id: jake.id, score: 1 },
      { card_id: card["Ryman Auditorium Tour"].id, participant_id: emily.id, score: 2 },

      // Dollywood — unanimous (avg 3.0)
      { card_id: card["Dollywood Theme Park"].id, participant_id: sarah.id, score: 3 },
      { card_id: card["Dollywood Theme Park"].id, participant_id: jake.id, score: 3 },
      { card_id: card["Dollywood Theme Park"].id, participant_id: emily.id, score: 3 },

      // Old Mill — solid (avg 2.33)
      { card_id: card["The Old Mill Restaurant"].id, participant_id: sarah.id, score: 3 },
      { card_id: card["The Old Mill Restaurant"].id, participant_id: jake.id, score: 2 },
      { card_id: card["The Old Mill Restaurant"].id, participant_id: emily.id, score: 2 },

      // Splash Country — meh (avg 1.33)
      { card_id: card["Dollywood Splash Country"].id, participant_id: jake.id, score: 2 },
      { card_id: card["Dollywood Splash Country"].id, participant_id: emily.id, score: 1 },

      // Ripley's — lukewarm (avg 1.67)
      { card_id: card["Ripley's Aquarium of the Smokies"].id, participant_id: sarah.id, score: 1 },
      { card_id: card["Ripley's Aquarium of the Smokies"].id, participant_id: jake.id, score: 2 },
      { card_id: card["Ripley's Aquarium of the Smokies"].id, participant_id: emily.id, score: 2 },

      // Pancake Pantry — strong (avg 2.67)
      { card_id: card["Pancake Pantry Breakfast"].id, participant_id: sarah.id, score: 3 },
      { card_id: card["Pancake Pantry Breakfast"].id, participant_id: jake.id, score: 2 },
      { card_id: card["Pancake Pantry Breakfast"].id, participant_id: emily.id, score: 3 },

      // Clingmans Dome — strong (avg 2.67)
      { card_id: card["Clingmans Dome Summit Hike"].id, participant_id: sarah.id, score: 3 },
      { card_id: card["Clingmans Dome Summit Hike"].id, participant_id: jake.id, score: 2 },
      { card_id: card["Clingmans Dome Summit Hike"].id, participant_id: emily.id, score: 3 },

      // SkyLift — decent (avg 2.33) — hence hot_contender
      { card_id: card["Gatlinburg SkyLift Park"].id, participant_id: sarah.id, score: 2 },
      { card_id: card["Gatlinburg SkyLift Park"].id, participant_id: jake.id, score: 3 },
      { card_id: card["Gatlinburg SkyLift Park"].id, participant_id: emily.id, score: 2 },

      // Go-Karts — just Jake voted
      { card_id: card["Pigeon Forge Go-Karts"].id, participant_id: jake.id, score: 2 },

      // Jack Daniel's — one vote
      { card_id: card["Jack Daniel's Distillery Tour"].id, participant_id: sarah.id, score: 2 },
    ];

    const { error: votesError } = await supabase.from("votes").insert(votes);
    if (votesError) {
      return NextResponse.json({ error: "Votes: " + votesError.message }, { status: 500 });
    }

    // ============================================================
    // 6. Comments — realistic planning conversation
    // ============================================================
    const commentData = [
      // --- Hattie B's ---
      {
        card_id: card["Hattie B's Hot Chicken"].id,
        participant_id: jake.id,
        content: "I've been dreaming about this place for MONTHS. Please nobody suggest mild 😂",
      },
      {
        card_id: card["Hattie B's Hot Chicken"].id,
        participant_id: emily.id,
        content: "I'm getting Medium at most. I saw a video of someone trying Shut the Cluck Up and they literally cried.",
      },
      {
        card_id: card["Hattie B's Hot Chicken"].id,
        participant_id: sarah.id,
        content: "Let's get there by 11:30 before the lunch rush. I read the wait can be 45+ minutes after noon.",
      },
      {
        card_id: card["Hattie B's Hot Chicken"].id,
        participant_id: jake.id,
        content: "Deal. Early bird gets the hot chicken. 🐔",
      },

      // --- Dollywood ---
      {
        card_id: card["Dollywood Theme Park"].id,
        participant_id: sarah.id,
        content: "I already bought our tickets! $150 each. Lightning Rod first thing — the line gets to 2 hours by afternoon.",
      },
      {
        card_id: card["Dollywood Theme Park"].id,
        participant_id: emily.id,
        content: "YES!! Also we NEED to get the cinnamon bread from The Grist Mill. It's famous for a reason.",
      },
      {
        card_id: card["Dollywood Theme Park"].id,
        participant_id: jake.id,
        content: "I'm riding everything. Wild Eagle, Tennessee Tornado, all of them. This is going to be incredible.",
      },
      {
        card_id: card["Dollywood Theme Park"].id,
        participant_id: sarah.id,
        content: "Should we do the TimeSaver pass? It's like $40 extra but you skip the lines.",
      },
      {
        card_id: card["Dollywood Theme Park"].id,
        participant_id: jake.id,
        content: "If we're there at opening we should be fine without it. Let's save the money for food.",
      },

      // --- Country Music Hall of Fame ---
      {
        card_id: card["Country Music Hall of Fame"].id,
        participant_id: emily.id,
        content: "I really want to do this! They have a Taylor Swift exhibit right now.",
      },
      {
        card_id: card["Country Music Hall of Fame"].id,
        participant_id: jake.id,
        content: "Honestly I'd rather spend more time on Broadway. Museums aren't really my thing.",
      },
      {
        card_id: card["Country Music Hall of Fame"].id,
        participant_id: sarah.id,
        content: "Maybe Emily and I can do this while Jake checks out the record shops? Then we meet up for Broadway?",
      },
      {
        card_id: card["Country Music Hall of Fame"].id,
        participant_id: emily.id,
        content: "That works! It's right downtown so we can meet up easily.",
      },

      // --- Broadway ---
      {
        card_id: card["Broadway Honky Tonk Tour"].id,
        participant_id: sarah.id,
        content: "Robert's Western World is a MUST. Best burger in Nashville + live honky tonk music. No cover charge!",
      },
      {
        card_id: card["Broadway Honky Tonk Tour"].id,
        participant_id: jake.id,
        content: "I've heard Tootsie's rooftop has amazing views. Let's start there and work our way down the strip.",
      },

      // --- Clingmans Dome ---
      {
        card_id: card["Clingmans Dome Summit Hike"].id,
        participant_id: sarah.id,
        content: "Bring a jacket! It's always 10-15 degrees cooler at the top even in summer.",
      },
      {
        card_id: card["Clingmans Dome Summit Hike"].id,
        participant_id: emily.id,
        content: "The sunrise from here is supposed to be amazing but I don't think any of us want to wake up that early 😅",
      },
      {
        card_id: card["Clingmans Dome Summit Hike"].id,
        participant_id: jake.id,
        content: "10am works. Not too early, gives us time for pancakes first!",
      },

      // --- SkyLift ---
      {
        card_id: card["Gatlinburg SkyLift Park"].id,
        participant_id: jake.id,
        content: "The SkyBridge looks INCREDIBLE. 680 feet long, glass floor panels in the middle!",
      },
      {
        card_id: card["Gatlinburg SkyLift Park"].id,
        participant_id: emily.id,
        content: "I'm terrified of heights but also... I want the photos. I'm in.",
      },
      {
        card_id: card["Gatlinburg SkyLift Park"].id,
        participant_id: sarah.id,
        content: "We might be tight on time depending on how long the hike takes. Let's keep it as a maybe.",
      },

      // --- Pancake Pantry ---
      {
        card_id: card["Pancake Pantry Breakfast"].id,
        participant_id: emily.id,
        content: "Austrian Apple Walnut pancakes. That's it. That's the comment.",
      },
      {
        card_id: card["Pancake Pantry Breakfast"].id,
        participant_id: sarah.id,
        content: "I looked at the menu and I already can't decide. Sweet Potato pancakes?? Caribbean pancakes?? How is this a real place.",
      },

      // --- Jack Daniel's ---
      {
        card_id: card["Jack Daniel's Distillery Tour"].id,
        participant_id: sarah.id,
        content: "This would be SO cool but Lynchburg is 1.5 hours from Nashville. Might need to save it for another trip.",
      },
      {
        card_id: card["Jack Daniel's Distillery Tour"].id,
        participant_id: jake.id,
        content: "Yeah that's a lot of driving. Maybe next time we do a Nashville-only trip?",
      },

      // --- Airbnb ---
      {
        card_id: card["Downtown Nashville Airbnb"].id,
        participant_id: sarah.id,
        content: "Booked! $150/night, $450 total split three ways = $150 each. It's in The Gulch which is super walkable.",
      },
      {
        card_id: card["Downtown Nashville Airbnb"].id,
        participant_id: emily.id,
        content: "The photos look amazing! Love that it has a rooftop. Perfect for morning coffee.",
      },
    ];

    // Insert comments one by one to preserve order
    const commentIds: string[] = [];
    for (const c of commentData) {
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert(c)
        .select()
        .single();
      if (commentError) {
        return NextResponse.json({ error: "Comment: " + commentError.message }, { status: 500 });
      }
      commentIds.push(comment.id);
    }

    // ============================================================
    // 7. Comment reactions
    // ============================================================
    const reactions = [
      // Jake's hot chicken comment — Sarah and Emily react
      { comment_id: commentIds[0], participant_id: sarah.id, emoji: "😂" },
      { comment_id: commentIds[0], participant_id: emily.id, emoji: "🔥" },
      // Emily's spice warning — Jake reacts
      { comment_id: commentIds[1], participant_id: jake.id, emoji: "💀" },
      // Sarah bought Dollywood tickets
      { comment_id: commentIds[4], participant_id: jake.id, emoji: "🎉" },
      { comment_id: commentIds[4], participant_id: emily.id, emoji: "❤️" },
      // Emily's cinnamon bread comment
      { comment_id: commentIds[5], participant_id: sarah.id, emoji: "🤤" },
      { comment_id: commentIds[5], participant_id: jake.id, emoji: "👆" },
      // Emily's pancake comment
      { comment_id: commentIds[22], participant_id: sarah.id, emoji: "😍" },
      { comment_id: commentIds[22], participant_id: jake.id, emoji: "💯" },
      // Emily scared of heights
      { comment_id: commentIds[20], participant_id: jake.id, emoji: "😂" },
      { comment_id: commentIds[20], participant_id: sarah.id, emoji: "💪" },
      // Sarah's Airbnb booking
      { comment_id: commentIds[26], participant_id: jake.id, emoji: "🙌" },
      { comment_id: commentIds[26], participant_id: emily.id, emoji: "🎉" },
    ];

    const { error: reactionsError } = await supabase.from("comment_reactions").insert(reactions);
    if (reactionsError) {
      return NextResponse.json({ error: "Reactions: " + reactionsError.message }, { status: 500 });
    }

    // ============================================================
    // 8. Expenses — booked items have real costs
    // ============================================================
    const expenses = [
      // Airbnb — Sarah paid
      {
        card_id: card["Downtown Nashville Airbnb"].id,
        amount: 450,
        paid_by_participant_id: sarah.id,
        split_type: "equal",
        category: "accommodation",
      },
      // Dollywood tickets — Sarah paid
      {
        card_id: card["Dollywood Theme Park"].id,
        amount: 450,
        paid_by_participant_id: sarah.id,
        split_type: "equal",
        category: "entertainment",
      },
      // Hattie B's — Jake paid
      {
        card_id: card["Hattie B's Hot Chicken"].id,
        amount: 72,
        paid_by_participant_id: jake.id,
        split_type: "equal",
        category: "food",
      },
    ];

    const { data: expenseRows, error: expError } = await supabase
      .from("expenses")
      .insert(expenses)
      .select();

    if (expError) {
      return NextResponse.json({ error: "Expenses: " + expError.message }, { status: 500 });
    }

    // ============================================================
    // 9. Expense splits
    // ============================================================
    const splits = [
      // Airbnb: $450 / 3 = $150 each
      { expense_id: expenseRows[0].id, participant_id: sarah.id, amount_owed: 150, is_settled: true },
      { expense_id: expenseRows[0].id, participant_id: jake.id, amount_owed: 150, is_settled: false },
      { expense_id: expenseRows[0].id, participant_id: emily.id, amount_owed: 150, is_settled: false },
      // Dollywood: $450 / 3 = $150 each
      { expense_id: expenseRows[1].id, participant_id: sarah.id, amount_owed: 150, is_settled: true },
      { expense_id: expenseRows[1].id, participant_id: jake.id, amount_owed: 150, is_settled: false },
      { expense_id: expenseRows[1].id, participant_id: emily.id, amount_owed: 150, is_settled: true },
      // Hattie B's: $72 / 3 = $24 each
      { expense_id: expenseRows[2].id, participant_id: sarah.id, amount_owed: 24, is_settled: false },
      { expense_id: expenseRows[2].id, participant_id: jake.id, amount_owed: 24, is_settled: true },
      { expense_id: expenseRows[2].id, participant_id: emily.id, amount_owed: 24, is_settled: false },
    ];

    const { error: splitsError } = await supabase.from("expense_splits").insert(splits);
    if (splitsError) {
      return NextResponse.json({ error: "Splits: " + splitsError.message }, { status: 500 });
    }

    // ============================================================
    // Done! Return trip data for client-side navigation
    // ============================================================
    return NextResponse.json({
      success: true,
      trip_id: tripId,
      redirect: `/trip/${tripId}`,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed demo data: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}
