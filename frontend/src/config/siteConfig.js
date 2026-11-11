/**
 * Every editable word, link and number on the site lives here.
 * Colours and fonts live in src/index.css (the @theme block).
 */

export const siteConfig = {
  event: {
    title: "Gagan's Diwali Soirée",
    dateText: "14th of November 2026",
    dateShort: "Sat, 14 Nov 2026",
    timeText: "7 PM",
    // Used for the "Add to calendar" style display only (no timezone math on the client).
    hostName: "Gagan",
  },

  home: {
    greetingHeading: "Happy Diwali!",
    greeting:
      "May this festival of lights fill your life with joy, warmth, laughter, and prosperity. Wishing you and your family a very Happy Diwali!",
    invite:
      "I can't wait to celebrate Diwali with all of you at my place on Saturday, the 14th of November 2026. The festivities begin at 7 PM, so mark your calendars and bring your festive spirit!",
    rsvpNote: "This website is for everyone who has RSVPed, and I'm so glad you're coming!",
    infoHeading: "Everything You Need to Know",
    // `icon` names map to lucide icons inside pages/Home.jsx
    infoItems: [
      {
        icon: "party",
        text: "Rule number one: have a blast. Fun is the only item on the agenda.",
        strong: "have a blast",
      },
      {
        icon: "shirt",
        text: "The dress code is strictly Indian traditional. Kurtas for the gents, sarees or lehengas for the ladies. Bring out your festive best!",
        strong: "strictly Indian traditional",
      },
      {
        icon: "wine",
        text: "It's a BYOB evening, so bring along whatever you like to sip on.",
        strong: "BYOB",
      },
      {
        icon: "glass",
        text: "Not drinking? No problem at all. There will be plenty of non-alcoholic options to keep your glass full.",
        strong: "plenty of non-alcoholic options",
      },
      {
        icon: "food",
        text: "Food is fully taken care of. Come hungry and leave happy.",
        strong: "Food is fully taken care of",
      },
      {
        icon: "clock",
        text: "Doors open at 7 PM. Do try to arrive early, because we'll be lighting crackers and you won't want to miss the sparkle.",
        strong: "7 PM",
      },
      {
        icon: "dice",
        text: "Got a favourite board game or a fun game-night idea? Bring it along so we can all play together.",
        strong: "board game",
      },
      {
        icon: "volume",
        text: "It's a residential area, so the loud music goes off at 10:30 PM. The party doesn't have to, though. Stay and chill for as long as you like. The night is young!",
        strong: "loud music goes off at 10:30 PM",
      },
      {
        icon: "tag",
        text: "Posting stories from the night? Please tag me in every single one of them!",
        strong: "tag me",
      },
      {
        icon: "ban",
        text: "Strictly no illegal substances. Let's keep it clean and keep it fun.",
        strong: "Strictly no illegal substances",
      },
    ],
  },

  gallery: {
    heading: "Live Gallery",
    subheading: "Snapshots from the party, fresh from everyone's phones.",
    emptyTitle: "No photos yet",
    emptyText: "Be the first to light up the gallery. Upload a photo and it will appear here.",
    refetchSeconds: 60,
  },

  upload: {
    heading: "Share Your Photos",
    subheading: "Upload all the photos you've clicked. They go straight into the party album.",
    buttonLabel: "Upload Photos",
    passcodeTitle: "Enter the party passcode",
    passcodeHint: "It's on the QR card at the party, or ask Gagan.",
    driveHeading: "Google Drive folder",
    driveNote:
      "The folder is private. If you open it and Drive asks you to request access, contact Gagan and he will add you.",
  },

  thankYou: {
    heading: "It wouldn't have been the same without you.",
    paragraphs: [
      "Thank you for making this Diwali so special. Your laughter, your outfits, your energy, and your presence made the night unforgettable. Thank you for making this happen!",
      "Wishing you and your loved ones a very Happy Diwali. May the lights of the diyas bring happiness, health, and success into your lives all year long.",
    ],
    uploadNudge:
      "Please upload all the photos you clicked to the Google Drive folder (use the Upload page), so everyone can access them.",
    uploadButton: "Upload your photos",
  },

  location: {
    heading: "Finding the Place",
    // Deliberately an area, not the house. The site is public.
    addressLines: ["Water Tank, Katriguppe", "Bangalore 560085"],
    areaName: "Katriguppe, Bangalore",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Katriguppe,+Banashankari+3rd+Stage,+Bengaluru,+Karnataka+560085&z=15&output=embed",
    mapsLink: "https://maps.app.goo.gl/pZskQZBE4q88EguF7",
    mapsDisclaimer:
      "This pin is not the exact address. Since it's a residential address, it isn't published openly on this website. Ping or call one of us below and we'll send you the exact location.",
    contactIntro: "For the detailed location, ping or call any of these numbers:",
    contacts: [
      { name: "Gagan", phone: "+91 99028 54469", tel: "+919902854469" },
      { name: "Jonathan", phone: "+91 83101 18636", tel: "+918310118636" },
      { name: "Abhishek", phone: "+91 87222 07551", tel: "+918722207551" },
    ],
    whatsapp: { name: "Gagan on WhatsApp", phone: "+1 408 439 0043", link: "https://wa.me/14084390043" },
  },

  admin: {
    heading: "Host Tools",
  },
};

export default siteConfig;
