/**
 * BhoomiSafe — Citizen App Internationalization (i18n) Engine
 * ==========================================================
 * Supports English (en), Hindi (hi), Assamese (as), and Khasi (kha).
 * Reads standalone JSON files when served via HTTP, with embedded JSON fallback
 * for local file:// previews.
 */

// Embedded fallback translations (matches locales/*.json)
const EMBEDDED_TRANSLATIONS = {
  en: {
    app_title: "BhoomiSafe — Citizen Landslide Reporter",
    app_subtitle: "Citizen Portal (NER)",
    back_link: "← Back",
    nav_report: "+ Report",
    helpline_text: "🚨 National Disaster Helpline:",
    conn_live: "Live Connection — Emergency Grid Active",
    conn_offline: "⚠️ Offline Mode — Reports will be queued in IndexedDB",
    conn_syncing: "Syncing queued reports with emergency servers...",
    conn_restored: "Connection restored! Syncing reports...",
    queue_pending: "report(s) queued on device",
    btn_sync_now: "Sync Now",
    hero_title: "Report a Landslide or Road Block",
    hero_subtitle: "Helps emergency responders & SDMAs send immediate rescue and clearing teams.",
    hero_btn: "Submit Ground Incident Report",
    guidelines_title: "Landslide Precaution Guidelines",
    guide_rain_title: "🌧️ High Rainfall Warning",
    guide_rain_desc: "If sustained rainfall exceeds 150mm/24h, avoid travelling through hill passes like NH-37 or Shillong Bypass.",
    guide_sound_title: "🔊 Listen for Warning Sounds",
    guide_sound_desc: "Trees cracking, boulders knocking, or sudden increase in muddy stream flow indicate imminent landslide activity.",
    guide_vehicle_title: "🚗 If Trapped in Vehicle",
    guide_vehicle_desc: "Abandon vehicle immediately if mud or debris starts moving onto the road and seek higher ground on foot.",
    footer_text: "BhoomiSafe Citizen Portal — Powered by AI Early Warning Systems for North East Region India",
    form_heading: "Report Landslide",
    label_name: "Your Name (Optional)",
    placeholder_name: "e.g. Anita Sharma",
    label_phone: "Phone Number (Optional)",
    placeholder_phone: "e.g. +91 98765 43210",
    label_district: "District *",
    label_severity: "Severity Level *",
    sev_low: "LOW — Minor soil creep / small rockfall",
    sev_medium: "MEDIUM — Partial road blockage",
    sev_high: "HIGH — Complete road block / structure damage",
    sev_critical: "CRITICAL — Massive mudslide / casualties",
    label_gps: "GPS Location",
    btn_gps: "📍 Detect My Location",
    gps_not_set: "Not set",
    gps_detecting: "Detecting coordinates...",
    gps_unsupported: "Geolocation not supported by browser",
    gps_fallback: "Unable to get location. Will use district centroid.",
    label_description: "Description *",
    placeholder_description: "Describe what happened, road name, nearby landmarks...",
    btn_submit: "Submit Emergency Incident Report",
    btn_submitting: "Submitting report...",
    msg_offline_queued: "⚠️ Device is offline. Report queued safely on your device and will automatically send once connectivity returns.",
    msg_server_queued: "⚠️ Server currently unreachable. Report queued safely on your device and will automatically send once connectivity returns.",
    msg_success: "✓ Report submitted successfully! District emergency officials have been notified.",
    msg_sync_success: "✓ Connection active: {count} queued report(s) successfully synced to SDMA emergency teams!",
    msg_sync_unstable: "⚠️ Connection unstable. Remaining report(s) kept safely in queue and will sync automatically.",
    msg_desc_too_short: "Description must be at least 10 characters long (e.g. road name, landmarks, blockage).",
    msg_rate_limit: "⚠️ Rate limit: Too many reports submitted from this IP. Please wait before submitting again.",
    btn_install_app: "Install",
    select_language: "Language"
  },
  hi: {
    app_title: "भूमिसेफ — नागरिक भूस्खलन रिपोर्टर",
    app_subtitle: "नागरिक पोर्टल (NER)",
    back_link: "← वापस",
    nav_report: "+ रिपोर्ट",
    helpline_text: "🚨 राष्ट्रीय आपदा हेल्पलाइन:",
    conn_live: "सक्रिय कनेक्शन — आपातकालीन ग्रिड चालू",
    conn_offline: "⚠️ ऑफ़लाइन मोड — रिपोर्ट IndexedDB में सुरक्षित होगी",
    conn_syncing: "कतारबद्ध रिपोर्टों को आपातकालीन सर्वर पर सिंक किया जा रहा है...",
    conn_restored: "कनेक्शन बहाल! रिपोर्टें सिंक हो रही हैं...",
    queue_pending: "रिपोर्ट डिवाइस पर सुरक्षित कतार में हैं",
    btn_sync_now: "अभी सिंक करें",
    hero_title: "भूस्खलन या सड़क अवरोध की सूचना दें",
    hero_subtitle: "आपातकालीन टीमों और SDMA को त्वरित बचाव और मलबा हटाने में मदद करता है।",
    hero_btn: "जमीनी घटना की रिपोर्ट दर्ज करें",
    guidelines_title: "भूस्खलन से बचाव के दिशानिर्देश",
    guide_rain_title: "🌧️ भारी बारिश की चेतावनी",
    guide_rain_desc: "यदि बारिश 150 मिमी/24 घंटे से अधिक हो, तो NH-37 या शिलांग बाईपास जैसे पहाड़ी रास्तों पर यात्रा से बचें।",
    guide_sound_title: "🔊 चेतावनी की आवाज़ें सुनें",
    guide_sound_desc: "पेड़ों का टूटना, पत्थरों का टकराना, या मटमैले पानी का अचानक बढ़ना भूस्खलन का संकेत है।",
    guide_vehicle_title: "🚗 यदि वाहन में फंसे हों",
    guide_vehicle_desc: "यदि सड़क पर मलबा आने लगे तो तुरंत वाहन छोड़कर पैदल सुरक्षित ऊंचे स्थान पर जाएं।",
    footer_text: "भूमिसेफ नागरिक पोर्टल — पूर्वोत्तर भारत के लिए एआई पूर्व चेतावनी प्रणाली द्वारा संचालित",
    form_heading: "भूस्खलन रिपोर्ट करें",
    label_name: "आपका नाम (वैकल्पिक)",
    placeholder_name: "उदा. अनिता शर्मा",
    label_phone: "फ़ोन नंबर (वैकल्पिक)",
    placeholder_phone: "उदा. +91 98765 43210",
    label_district: "ज़िला *",
    label_severity: "गंभीरता स्तर *",
    sev_low: "निम्न — मामूली मिट्टी का खिसकना / छोटा मलबा",
    sev_medium: "मध्यम — आंशिक सड़क अवरोध",
    sev_high: "उच्च — पूर्ण सड़क जाम / संरचना को नुकसान",
    sev_critical: "गंभीर — भारी भूस्खलन / जनहानि का खतरा",
    label_gps: "जीपीएस स्थान",
    btn_gps: "📍 मेरा स्थान पहचानें",
    gps_not_set: "निर्धारित नहीं",
    gps_detecting: "स्थान की पहचान की जा रही है...",
    gps_unsupported: "ब्राउज़र द्वारा जियोलोकेशन समर्थित नहीं है",
    gps_fallback: "स्थान प्राप्त करने में असमर्थ। ज़िला केंद्र का उपयोग किया जाएगा।",
    label_description: "विवरण *",
    placeholder_description: "घटना का विवरण, सड़क का नाम, निकटतम लैंडमार्क लिखें...",
    btn_submit: "आपातकालीन घटना रिपोर्ट दर्ज करें",
    btn_submitting: "रिपोर्ट दर्ज की जा रही है...",
    msg_offline_queued: "⚠️ आपका डिवाइस ऑफ़लाइन है। आपकी रिपोर्ट सुरक्षित कतार में है और इंटरनेट बहाल होते ही स्वतः भेज दी जाएगी।",
    msg_server_queued: "⚠️ सर्वर से संपर्क नहीं हो पा रहा है। आपकी रिपोर्ट सुरक्षित कतार में है और पुनः प्रयास किया जाएगा।",
    msg_success: "✓ रिपोर्ट सफलतापूर्वक दर्ज की गई! ज़िला आपदा प्रबंधन अधिकारियों को सूचित कर दिया गया है।",
    msg_sync_success: "✓ कनेक्शन सक्रिय: {count} कतारबद्ध रिपोर्ट सफलतापूर्वक आपदा टीमों को भेज दी गई!",
    msg_sync_unstable: "⚠️ कनेक्शन अस्थिर है। शेष रिपोर्टें सुरक्षित कतार में हैं और स्वतः सिंक होंगी।",
    msg_desc_too_short: "विवरण कम से कम 10 अक्षरों का होना चाहिए (सड़क का नाम, निकटतम स्थान आदि)।",
    msg_rate_limit: "⚠️ बहुत अधिक रिपोर्टें भेजी गई हैं। कृपया 1 मिनट बाद पुनः प्रयास करें।",
    btn_install_app: "इंस्टॉल",
    select_language: "भाषा"
  },
  as: {
    app_title: "ভূমিছেফ — নাগৰিক ভূমিস্খলন প্ৰতিবেদন সেৱা",
    app_subtitle: "নাগৰিক প'ৰ্টেল (NER)",
    back_link: "← উভতি যাওক",
    nav_report: "+ প্ৰতিবেদন",
    helpline_text: "🚨 ৰাষ্ট্ৰীয় দুৰ্যোগ হেল্পলাইন:",
    conn_live: "সক্ৰিয় সংযোগ — জৰুৰীকালীন নেটৱৰ্ক উপলব্ধ",
    conn_offline: "⚠️ অফলাইন মোড — প্ৰতিবেদন IndexedDB-ত সুৰক্ষিত হ'ব",
    conn_syncing: "জৰুৰীকালীন চাৰ্ভাৰৰ সৈতে প্ৰতিবেদন সংমিশ্ৰণ চলি আছে...",
    conn_restored: "সংযোগ পুনৰ স্থাপন হ'ল! প্ৰতিবেদন প্ৰেৰণ কৰা হৈছে...",
    queue_pending: "টা প্ৰতিবেদন যন্ত্ৰত সুৰক্ষিতভাৱে জমা আছে",
    btn_sync_now: "এতিয়াই সংমিশ্ৰণ কৰক",
    hero_title: "ভূমিস্খলন বা পথ বন্ধৰ প্ৰতিবেদন দিয়ক",
    hero_subtitle: "জৰুৰীকালীন সাহায্যকাৰী আৰু SDMA-ক তৎকালীন উদ্ধাৰ কাৰ্যত সহায় কৰে।",
    hero_btn: "ভূমিস্খলনৰ প্ৰতিবেদন জমা দিয়ক",
    guidelines_title: "ভূমিস্খলন সতৰ্কতামূলক নিৰ্দেশনা",
    guide_rain_title: "🌧️ অতিপাত বৰষুণৰ সতৰ্কবাণী",
    guide_rain_desc: "যদি বৰষুণ ১৫০ মিমি/২৪ ঘণ্টাতকৈ অধিক হয়, তেন্তে পাহাৰীয়া ৰাষ্ট্ৰীয় ঘাইপথ (NH-37) আদিত ভ্ৰমণ নকৰিব।",
    guide_sound_title: "🔊 সতৰ্কতামূলক শব্দলৈ মন কৰক",
    guide_sound_desc: "গছ মৰমৰাই ভগা, শিল খহি পৰা, বা নদীৰ পানী হঠাৎ ঘোলা হৈ বৃদ্ধি পোৱাটো ভূমিস্খলনৰ লক্ষণ।",
    guide_vehicle_title: "🚗 গাড়ীত আৱদ্ধ হৈ থাকিলে",
    guide_vehicle_desc: "যদি পথত মাটি খহিবলৈ আৰম্ভ কৰে, তৎক্ষণাৎ গাড়ী এৰি খোজকাঢ়ি ওখ স্থানলৈ যাওক।",
    footer_text: "ভূমিছেফ নাগৰিক প'ৰ্টেল — উত্তৰ-পূৰ্বাঞ্চলৰ বাবে এআই আগতীয় সতৰ্কবাণী ব্যৱস্থা",
    form_heading: "ভূমিস্খলন প্ৰতিবেদন",
    label_name: "আপোনাৰ নাম (ঐচ্ছিক)",
    placeholder_name: "উদাহৰণ: অনিতা শৰ্মা",
    label_phone: "ফোন নম্বৰ (ঐচ্ছিক)",
    placeholder_phone: "উদাহৰণ: +91 98765 43210",
    label_district: "জিলা *",
    label_severity: "ক্ষতিৰ মাত্ৰা *",
    sev_low: "নিম্ন — সামান্য মাটি খহা / সৰু শিল পৰা",
    sev_medium: "মধ্যম — পথৰ আংশিক অৱৰোধ",
    sev_high: "উচ্চ — সম্পূৰ্ণ পথ বন্ধ / ঘৰৰ ক্ষতি",
    sev_critical: "চৰম — বৃহৎ ভূমিস্খলন / প্ৰাণহানিৰ আশংকা",
    label_gps: "GPS অৱস্থান",
    btn_gps: "📍 মোৰ স্থান নিৰ্ণয় কৰক",
    gps_not_set: "নিৰ্ধাৰণ হোৱা নাই",
    gps_detecting: "স্থান নিৰ্ণয় কৰা হৈছে...",
    gps_unsupported: "ব্ৰাউজাৰে জিঅ'লকেচন সমৰ্থন নকৰে",
    gps_fallback: "স্থান লাভত ব্যৰ্থ। জিলা কেন্দ্ৰ ব্যৱহাৰ কৰা হ'ব।",
    label_description: "বিৱৰণ *",
    placeholder_description: "ঘটনাৰ সবিশেষ, পথৰ নাম, ওচৰৰ চিনাকী স্থান লিখক...",
    btn_submit: "জৰুৰীকালীন ভূমিস্খলন প্ৰতিবেদন জমা দিয়ক",
    btn_submitting: "প্ৰতিবেদন জমা হৈ আছে...",
    msg_offline_queued: "⚠️ আপোনাৰ যন্ত্ৰ অফলাইন আছে। প্ৰতিবেদনটো আপোনাৰ যন্ত্ৰত সুৰক্ষিতভাৱে জমা কৰা হৈছে আৰু ইন্টাৰনেট পোৱাৰ লগে লগে স্বয়ংক্ৰিয়ভাৱে প্ৰেৰণ হ'ব।",
    msg_server_queued: "⚠️ চাৰ্ভাৰ উপলব্ধ নহয়। প্ৰতিবেদনটো সুৰক্ষিতভাৱে জমা কৰা হৈছে আৰু পুনৰ প্ৰেৰণৰ চেষ্টা কৰা হ'ব।",
    msg_success: "✓ প্ৰতিবেদন সফলতাৰে জমা হ'ল! জিলা দুৰ্যোগ ব্যৱস্থাপনা বিষয়াসকলক জনোৱা হৈছে।",
    msg_sync_success: "✓ সংযোগ সক্ৰিয়: {count} টা প্ৰতিবেদন দুৰ্যোগ নিয়ন্ত্ৰণ বিভাগলৈ সফলতাৰে প্ৰেৰণ কৰা হ'ল!",
    msg_sync_unstable: "⚠️ নেটৱৰ্ক দুৰ্বল। বাকী প্ৰতিবেদন সুৰক্ষিতভাৱে সংৰক্ষিত আছে আৰু স্বয়ংক্ৰিয়ভাৱে সংমিশ্ৰিত হ'ব।",
    msg_desc_too_short: "বিৱৰণ অন্ততঃ ১০ টা আখৰৰ হ'ব লাগিব (পথৰ নাম, চিনাকী স্থান আদি)।",
    msg_rate_limit: "⚠️ অনুগ্ৰহ কৰি ১ মিনিট অপেক্ষা কৰি পুনৰ চেষ্টা কৰক।",
    btn_install_app: "ইনষ্টল",
    select_language: "ভাষা"
  },
  kha: {
    app_title: "BhoomiSafe — Ka Portal Pynpoi Khubor Jingtwad Khyndew",
    app_subtitle: "Portal Ki Nongshongshnong",
    back_link: "← Phai Dien",
    nav_report: "+ Khubor",
    helpline_text: "🚨 Helpline Jingiada Duh-Iing:",
    conn_live: "Don Internet — Ka Grid Jingiada Ka Trei Kam",
    conn_offline: "⚠️ Khlem Internet — Yn kynshew ha IndexedDB",
    conn_syncing: "Dang phah ia ki khubor sha ka emergency server...",
    conn_restored: "La ioh internet biang! Dang phah khubor...",
    queue_pending: "tylli ki khubor la kynshew hapoh ka kor",
    btn_sync_now: "Phah Mynta",
    hero_title: "Pynpoi Khubor Jingtwad Khyndew lane Jingkhang Surok",
    hero_subtitle: "Iarap ia ki kynhun iarap bad ka SDMA ban phah kloi ia ki briew bad ki tiar ban plie surok.",
    hero_btn: "Phah Ia Ka Khubor Jingjia",
    guidelines_title: "Ki Jingbthah Ban Iada Na Ka Jingtwad Khyndew",
    guide_rain_title: "🌧️ Jingma Na Ka Slap Kaba Jur",
    guide_rain_desc: "Lada u slap u jur palat 150mm/24h, kiar na kaba leit jngai lyngba ki surok lum kum ka NH-37 lane Shillong Bypass.",
    guide_sound_title: "🔊 Sngap Ia Ki Jingsawa Ba Khreh Ban Twad",
    guide_sound_desc: "Jingkdor ki dieng, jingkynud ki mawbah, lane jingtuid duma ka umwah ki pyni ba khyndew kan sa twad.",
    guide_vehicle_title: "🚗 Lada Sahkut Hapoh Kali",
    guide_vehicle_desc: "Mih noh shisyndon na kali lada ka khyndew ne u duma u sdang ban tuid sha surok bad kiew sha ki jaka ba heh.",
    footer_text: "BhoomiSafe Citizen Portal — AI Early Warning System na ka bynta ka North East Region India",
    form_heading: "Pynpoi Khubor",
    label_name: "Kyrteng Jong Phi (Mon sngewbha)",
    placeholder_name: "kumba: Anita Sharma",
    label_phone: "Nombor Phone (Mon sngewbha)",
    placeholder_phone: "kumba: +91 98765 43210",
    label_district: "Distrik *",
    label_severity: "Ka Jingjur Jong Ka Jingjia *",
    sev_low: "DUNA — Ka jingtwad khyndew barit / rit ki maw",
    sev_medium: "MARPDENG — Sahkut ka surok dkhot",
    sev_high: "JUR — Khang lut ka surok / pynjulor iing",
    sev_critical: "JUR SHIKADDEI — Jingtwad kaba khraw / jingma ia ki jingim",
    label_gps: "Ka Jaka GPS",
    btn_gps: "📍 Wad Ia Ka Jaka Jong Nga",
    gps_not_set: "Ym pat shna",
    gps_detecting: "Dang wad ia ka jaka...",
    gps_unsupported: "Ka browser kam lah ban wad GPS",
    gps_fallback: "Ym lah ioh jaka. Yn pyndonkam ia ka centroid jong ka distrik.",
    label_description: "Jingbatai *",
    placeholder_description: "Batai kiei kiba jia, kyrteng surok, ki dak kiba marjan...",
    btn_submit: "Phah Ia Ka Khubor Jingtwad Khyndew",
    btn_submitting: "Dang phah khubor...",
    msg_offline_queued: "⚠️ Ka kor jong phi kam don internet. Ia ka khubor la buh bha hapoh ka kor bad kan phah hi lada ioh internet biang.",
    msg_server_queued: "⚠️ Ym lah ioh connection sha ka server. Ia ka khubor la buh bha hapoh ka kor bad kan phah hi ynda biang ka network.",
    msg_success: "✓ La phah bha ia ka khubor! Ki bor ba dei peit (SDMA) kila ioh jingtip.",
    msg_sync_success: "✓ Don internet: {count} tylli ki khubor la phah bha sha ki kynhun iarap!",
    msg_sync_unstable: "⚠️ Network kam pat biang bha. Ki khubor ki dang sah hapoh ka kor bad yn phah hi.",
    msg_desc_too_short: "Ka jingbatai dei ban don duna eh 10 tylli ki dak (kyrteng surok, ki dak ba marjan).",
    msg_rate_limit: "⚠️ Phi la phah palat ia ki khubor. Sngewbha ap 1 minit.",
    btn_install_app: "Pynskhem",
    select_language: "Ktien"
  }
};

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'kha', name: 'Khasi', nativeName: 'Khasi' }
];

let currentLang = localStorage.getItem('bhoomi_lang') || 'en';
if (!EMBEDDED_TRANSLATIONS[currentLang]) {
  currentLang = 'en';
}

/**
 * Translate a key into the currently selected language with optional string interpolations.
 */
function t(key, params = {}) {
  const dict = EMBEDDED_TRANSLATIONS[currentLang] || EMBEDDED_TRANSLATIONS.en;
  let text = dict[key] || EMBEDDED_TRANSLATIONS.en[key] || key;
  
  // Replace params e.g. {count}
  for (const [pKey, pVal] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
  }
  return text;
}

/**
 * Set active language, persist to localStorage, and re-translate DOM.
 */
function setLanguage(lang) {
  if (!EMBEDDED_TRANSLATIONS[lang]) return;
  currentLang = lang;
  localStorage.setItem('bhoomi_lang', lang);
  applyTranslations();

  // Sync select element if present
  const langSelect = document.getElementById('langSelect');
  if (langSelect && langSelect.value !== lang) {
    langSelect.value = lang;
  }

  // Dispatch event for dynamic script subscribers (e.g. app.js)
  window.dispatchEvent(new CustomEvent('bhoomi_language_change', { detail: { lang } }));
}

function getCurrentLanguage() {
  return currentLang;
}

/**
 * Apply translations to all DOM elements tagged with data-i18n attributes.
 */
function applyTranslations() {
  // 1. Text content
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) {
      el.textContent = translation;
    }
  });

  // 2. Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    if (translation) {
      el.placeholder = translation;
    }
  });

  // 3. Titles / Tooltips
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const translation = t(key);
    if (translation) {
      el.title = translation;
    }
  });

  // 4. Update html lang attribute
  document.documentElement.lang = currentLang;
}

/**
 * Initialize Language Switcher Dropdown in the Header
 */
function initLanguageSwitcher() {
  const container = document.getElementById('langSwitcherContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="lang-switcher-wrapper">
      <span class="lang-globe-icon" aria-hidden="true">🌐</span>
      <select id="langSelect" class="lang-select" aria-label="Choose Language / भाषा / ভাষা / Ktien">
        ${SUPPORTED_LANGUAGES.map(
          (l) => `<option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>${l.nativeName}</option>`
        ).join('')}
      </select>
    </div>
  `;

  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
}

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initLanguageSwitcher();
  applyTranslations();
});

// Expose globally for app.js
window.BhoomiI18n = {
  t,
  setLanguage,
  getCurrentLanguage,
  applyTranslations,
  SUPPORTED_LANGUAGES,
};
