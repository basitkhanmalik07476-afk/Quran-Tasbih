const STORAGE_KEY = "tasbih-counter-v1";
const countOutput = document.querySelector("#count");
const remainingOutput = document.querySelector("#remaining");
const dhikrSelect = document.querySelector("#dhikrSelect");
const goalSelect = document.querySelector("#goalSelect");
const dhikrDisplay = document.querySelector("#dhikrDisplay");
const progressRing = document.querySelector("#progressRing");
const toast = document.querySelector("#toast");
const installButton = document.querySelector("#installButton");
const tasbihTab = document.querySelector("#tasbihTab");
const quranTab = document.querySelector("#quranTab");
const playerTab = document.querySelector("#playerTab");
const tasbihView = document.querySelector("#tasbihView");
const quranView = document.querySelector("#quranView");
const playerView = document.querySelector("#playerView");
const welcome = document.querySelector("#welcome");
const surahSelect = document.querySelector("#surahSelect");
const surahHeading = document.querySelector("#surahHeading");
const ayahList = document.querySelector("#ayahList");
const readerStatus = document.querySelector("#readerStatus");
const quranSearch = document.querySelector("#quranSearch");
const translationToggle = document.querySelector("#translationToggle");
const searchResults = document.querySelector("#searchResults");
const resumeReading = document.querySelector("#resumeReading");
const quranProgress = document.querySelector("#quranProgress");
const progressPercent = document.querySelector("#progressPercent");
const progressDetail = document.querySelector("#progressDetail");
const quranAudio = document.querySelector("#quranAudio");
const nextAudioPreloader = document.createElement("audio");
const playerTrackTitle = document.querySelector("#playerTrackTitle");
const playerTrackArabic = document.querySelector("#playerTrackArabic");
const playerStatus = document.querySelector("#playerStatus");
const playerSeek = document.querySelector("#playerSeek");
const playerCurrentTime = document.querySelector("#playerCurrentTime");
const playerDuration = document.querySelector("#playerDuration");
const playPauseButton = document.querySelector("#playPauseButton");
const shuffleButton = document.querySelector("#shuffleButton");
const repeatButton = document.querySelector("#repeatButton");
const repeatOneBadge = document.querySelector("#repeatOneBadge");
const playlistItems = document.querySelector("#playlistItems");
const playbackRate = document.querySelector("#playbackRate");
const playerVolume = document.querySelector("#playerVolume");

const juzNames = [
  "Alif Lam Meem",
  "Sayaqool",
  "Tilkal Rusul",
  "Lan Tana Loo",
  "Wal Mohsanat",
  "La Yuhibbullah",
  "Wa Iza Samiu",
  "Wa Lau Annana",
  "Qalal Malao",
  "Wa A'lamu",
  "Yatazeroon",
  "Wa Mamin Da'abat",
  "Wa Ma Ubrioo",
  "Rubama",
  "Subhanallazi",
  "Qal Alam",
  "Iqtaraba",
  "Qad Aflaha",
  "Wa Qalallazina",
  "Amman Khalaq",
  "Utlu Ma Oohi",
  "Wa Manyaqnut",
  "Wa Mali",
  "Faman Azlam",
  "Elahe Yuruddo",
  "Ha Meem",
  "Qala Fama Khatbukum",
  "Qad Sami Allah",
  "Tabarakallazi",
  "Amma"
];

let state = loadState();
let toastTimer;
let installPrompt;
let quranData;
let quranLoadPromise;
let readerState = loadReaderState();
let audioState = loadAudioState();
let queuedNextSurah = null;
nextAudioPreloader.preload = "metadata";

function loadAudioState() {
  try {
    const saved = JSON.parse(localStorage.getItem("tasbih-quran-audio-v1") || "{}");
    const rate = [0.75, 1, 1.25, 1.5, 2].includes(saved.rate) ? saved.rate : 1;
    return {
      surah: Number.isInteger(saved.surah) && saved.surah >= 1 && saved.surah <= 114 ? saved.surah : 1,
      shuffle: saved.shuffle === true,
      repeat: [0, 1, 2].includes(saved.repeat) ? saved.repeat : 0,
      rate,
      volume: Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.8
    };
  } catch (error) {
    console.error("Could not load saved Quran audio settings.", error);
    return { surah: 1, shuffle: false, repeat: 0, rate: 1, volume: 0.8 };
  }
}

function saveAudioState() {
  try {
    localStorage.setItem("tasbih-quran-audio-v1", JSON.stringify(audioState));
  } catch (error) {
    console.error("Could not save Quran audio settings.", error);
    showToast("Your browser could not save audio settings.");
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const dhikr = typeof saved.dhikr === "string" && [...dhikrSelect.options].some(option => option.value === saved.dhikr)
      ? saved.dhikr
      : dhikrSelect.value;
    const counts = saved.counts && typeof saved.counts === "object" && !Array.isArray(saved.counts)
      ? Object.fromEntries(Object.entries(saved.counts).filter(([, count]) => Number.isSafeInteger(count) && count >= 0))
      : {};
    if (counts[dhikr] === undefined && Number.isSafeInteger(saved.count) && saved.count >= 0) {
      counts[dhikr] = saved.count;
    }
    return {
      count: counts[dhikr] || 0,
      counts,
      goal: [33, 99, 100].includes(saved.goal) || (Number.isSafeInteger(saved.goal) && saved.goal > 0) ? saved.goal : 33,
      dhikr,
      vibration: saved.vibration === true
    };
  } catch (error) {
    console.error("Could not load the saved tasbih count.", error);
    return { count: 0, counts: {}, goal: 33, dhikr: dhikrSelect.value, vibration: false };
  }
}

function loadReaderState() {
  try {
    const saved = JSON.parse(localStorage.getItem("tasbih-quran-reader-v1") || "{}");
    const readAyahs = Array.isArray(saved.readAyahs)
      ? saved.readAyahs.filter(key => typeof key === "string" && /^\d{1,3}:\d{1,3}$/.test(key))
      : [];
    const lastRead = saved.lastRead
      && Number.isInteger(saved.lastRead.surah) && saved.lastRead.surah >= 1 && saved.lastRead.surah <= 114
      && Number.isInteger(saved.lastRead.ayah) && saved.lastRead.ayah >= 1
      ? { surah: saved.lastRead.surah, ayah: saved.lastRead.ayah }
      : null;
    return {
      surah: Number.isInteger(saved.surah) && saved.surah >= 1 && saved.surah <= 114 ? saved.surah : 1,
      mode: saved.mode === "juz" ? "juz" : "surah",
      juz: Number.isInteger(saved.juz) && saved.juz >= 1 && saved.juz <= 30 ? saved.juz : 1,
      showTranslation: saved.showTranslation !== false,
      readAyahs: new Set(readAyahs),
      lastRead
    };
  } catch (error) {
    console.error("Could not load saved Quran reading progress.", error);
    return { surah: 1, mode: "surah", juz: 1, showTranslation: true, readAyahs: new Set(), lastRead: null };
  }
}

function saveReaderState() {
  try {
    localStorage.setItem("tasbih-quran-reader-v1", JSON.stringify({
      surah: readerState.surah,
      mode: readerState.mode,
      juz: readerState.juz,
      showTranslation: readerState.showTranslation,
      readAyahs: [...readerState.readAyahs],
      lastRead: readerState.lastRead
    }));
  } catch (error) {
    console.error("Could not save Quran reading progress.", error);
    showToast("Your browser could not save Quran reading progress.");
  }
}

function saveState() {
  try {
    state.counts[state.dhikr] = state.count;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save the tasbih count.", error);
    showToast("Your browser could not save this count.");
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setActiveView(view) {
  const activeView = ["player", "quran", "tasbih"].includes(view) ? view : "player";
  const activeViewChanged = (
    (activeView === "player" && playerView.hidden)
    || (activeView === "quran" && quranView.hidden)
    || (activeView === "tasbih" && tasbihView.hidden)
  );
  playerView.hidden = activeView !== "player";
  quranView.hidden = activeView !== "quran";
  tasbihView.hidden = activeView !== "tasbih";
  welcome.hidden = activeView !== "tasbih";
  for (const [tab, tabView] of [
    [playerTab, "player"],
    [quranTab, "quran"],
    [tasbihTab, "tasbih"]
  ]) {
    const selected = tabView === activeView;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  }
  if (activeView === "player" || activeView === "quran") loadQuran();
  if (activeViewChanged) window.scrollTo({ top: 0, behavior: "smooth" });
}

function loadQuran() {
  if (quranData) return Promise.resolve();
  if (quranLoadPromise) return quranLoadPromise;
  quranLoadPromise = loadQuranData().finally(() => {
    quranLoadPromise = null;
  });
  return quranLoadPromise;
}

async function loadQuranData() {
  readerStatus.classList.remove("is-error");
  readerStatus.hidden = false;
  readerStatus.textContent = "Loading the complete Quran…";
  updatePlayerStatus("Loading Quran…");
  try {
    const [textResponse, metadataResponse, translationResponse, juzResponse] = await Promise.all([
      fetch("./data/quran-uthmani.txt"),
      fetch("./data/surah-metadata.json"),
      fetch("./data/translation-ur-jalandhry.txt"),
      fetch("./data/juz-metadata.json")
    ]);
    if (!textResponse.ok || !metadataResponse.ok || !translationResponse.ok || !juzResponse.ok) {
      throw new Error("Quran, Urdu translation, or reading metadata could not be loaded.");
    }
    const [text, metadata, translationText, juzMetadata] = await Promise.all([
      textResponse.text(),
      metadataResponse.json(),
      translationResponse.text(),
      juzResponse.json()
    ]);
    if (!Array.isArray(metadata) || metadata.length !== 114 || !Array.isArray(juzMetadata) || juzMetadata.length !== 30) {
      throw new Error("Surah or Sipara metadata is incomplete.");
    }

    const surahs = metadata.map(info => ({ ...info, ayahs: [] }));
    const translations = [];
    for (const line of translationText.split(/\r?\n/)) {
      const match = line.match(/^(\d+)\|(\d+)\|(.*)$/);
      if (match) translations.push({ surah: Number(match[1]), ayah: Number(match[2]), text: match[3] });
    }
    if (translations.length !== 6236) throw new Error(`Urdu translation validation failed (${translations.length} ayahs loaded).`);
    let ayahCount = 0;
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^(\d+)\|(\d+)\|(.+)$/);
      if (!match) continue;
      const surahNumber = Number(match[1]);
      const ayahNumber = Number(match[2]);
      const surah = surahs[surahNumber - 1];
      if (!surah || ayahNumber !== surah.ayahs.length + 1) {
        throw new Error("Quran ayah numbering did not pass validation.");
      }
      const translation = translations[ayahCount];
      if (!translation || translation.surah !== surahNumber || translation.ayah !== ayahNumber) {
        throw new Error(`Urdu translation does not match Surah ${surahNumber}, ayah ${ayahNumber}.`);
      }
      surah.ayahs.push({ number: ayahNumber, surah: surahNumber, text: match[3], translation: translation.text });
      ayahCount += 1;
    }
    if (ayahCount !== 6236 || surahs.some(surah => surah.ayahs.length !== surah.numberOfAyahs)) {
      throw new Error(`Quran text validation failed (${ayahCount} ayahs loaded).`);
    }
    const ayahs = surahs.flatMap(surah => surah.ayahs.map(ayah => ({ ...ayah, surah: surah.number })));
    let juzIndex = 0;
    for (let index = 0; index < ayahs.length; index += 1) {
      while (juzIndex + 1 < juzMetadata.length
        && juzMetadata[juzIndex + 1].start.surah === ayahs[index].surah
        && juzMetadata[juzIndex + 1].start.ayah === ayahs[index].number) {
        juzIndex += 1;
      }
      ayahs[index].juz = juzIndex + 1;
      surahs[ayahs[index].surah - 1].ayahs[ayahs[index].number - 1].juz = juzIndex + 1;
    }
    if (juzMetadata.some((juz, index) => juz.number !== index + 1
      || ayahs.filter(ayah => ayah.juz === juz.number).length !== juz.ayahCount)) {
      throw new Error("Sipara boundaries did not pass validation.");
    }
    quranData = { surahs, ayahs, juzs: juzMetadata };
    populateSurahSelect();
    initializeAudioPlayer();
    readerStatus.hidden = true;
    translationToggle.checked = readerState.showTranslation;
    updateReadingProgress();
    renderReader();
  } catch (error) {
    console.error("Could not load the complete Quran.", error);
    readerStatus.textContent = "The Quran text could not be loaded. Please check that the app files are available, then reload.";
    readerStatus.classList.add("is-error");
    updatePlayerStatus("Quran data unavailable", true);
  }
}

function populateSurahSelect() {
  const fragment = document.createDocumentFragment();
  const juzGroup = document.createElement("optgroup");
  juzGroup.label = "30 Siparay · 30 Juz";
  for (const juz of quranData.juzs) {
    const option = document.createElement("option");
    option.value = `juz:${juz.number}`;
    option.textContent = `سپارہ ${juz.number} · ${juzNames[juz.number - 1]} · Juz ${juz.number}`;
    juzGroup.append(option);
  }
  fragment.append(juzGroup);
  const surahGroup = document.createElement("optgroup");
  surahGroup.label = "114 Surahs";
  for (const surah of quranData.surahs) {
    const option = document.createElement("option");
    option.value = `surah:${surah.number}`;
    option.textContent = `${String(surah.number).padStart(3, "0")} · ${surah.englishName} — ${surah.englishNameTranslation}`;
    surahGroup.append(option);
  }
  fragment.append(surahGroup);
  surahSelect.replaceChildren(fragment);
}

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function updatePlayerStatus(message, isError = false) {
  playerStatus.textContent = message;
  playerStatus.classList.toggle("is-error", isError);
}

function updateAudioProgress() {
  const duration = quranAudio.duration;
  const currentTime = quranAudio.currentTime;
  playerCurrentTime.textContent = formatAudioTime(currentTime);
  playerDuration.textContent = formatAudioTime(duration);
  const progress = Number.isFinite(duration) && duration > 0 ? currentTime / duration * 100 : 0;
  playerSeek.value = String(Math.round(progress * 10));
  playerSeek.style.setProperty("--seek-progress", `${progress}%`);
}

function updatePlaylistSelection() {
  playlistItems.querySelectorAll(".playlist-track").forEach(button => {
    const isCurrent = Number(button.dataset.surah) === audioState.surah;
    button.classList.toggle("is-current", isCurrent);
    button.setAttribute("aria-selected", String(isCurrent));
  });
}

function renderPlaylist() {
  if (!quranData) return;
  const fragment = document.createDocumentFragment();
  for (const surah of quranData.surahs) {
    const button = createElement("button", "playlist-track");
    button.type = "button";
    button.dataset.surah = String(surah.number);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(surah.number === audioState.surah));
    const name = createElement("span", "playlist-track-name", `${String(surah.number).padStart(3, "0")} · ${surah.englishName}`);
    const arabicName = createElement("span", "playlist-track-arabic", surah.name);
    arabicName.lang = "ar";
    arabicName.dir = "rtl";
    button.append(name, arabicName);
    button.classList.toggle("is-current", surah.number === audioState.surah);
    fragment.append(button);
  }
  playlistItems.replaceChildren(fragment);
}

function selectAudioTrack(surahNumber, shouldPlay = false) {
  if (!quranData || !Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) return;
  const surah = quranData.surahs[surahNumber - 1];
  const source = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNumber}.mp3`;
  const changed = audioState.surah !== surahNumber || quranAudio.src !== source;
  audioState.surah = surahNumber;
  playerTrackTitle.textContent = `${surah.number}. ${surah.englishName}`;
  playerTrackArabic.textContent = surah.name;
  playPauseButton.setAttribute("aria-label", `${quranAudio.paused ? "Play" : "Pause"} ${surah.englishName}`);
  if (changed) {
    quranAudio.src = source;
    quranAudio.load();
    playerCurrentTime.textContent = "0:00";
    playerDuration.textContent = "0:00";
    playerSeek.value = "0";
    playerSeek.style.setProperty("--seek-progress", "0%");
    updatePlayerStatus("Ready to play");
  }
  updatePlaylistSelection();
  if (changed) saveAudioState();
  preloadNextTrack();
  if (shouldPlay) playCurrentTrack();
}

function preloadNextTrack() {
  if (!quranData || audioState.repeat === 2) {
    queuedNextSurah = null;
    nextAudioPreloader.removeAttribute("src");
    nextAudioPreloader.load();
    return;
  }
  const nextSurah = chooseNextTrack();
  queuedNextSurah = nextSurah;
  const source = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${nextSurah}.mp3`;
  if (nextAudioPreloader.src !== source) {
    nextAudioPreloader.src = source;
    nextAudioPreloader.load();
  }
}

function chooseNextTrack() {
  let nextSurah;
  if (audioState.shuffle) {
    nextSurah = audioState.surah;
    while (nextSurah === audioState.surah && quranData.surahs.length > 1) {
      nextSurah = Math.floor(Math.random() * quranData.surahs.length) + 1;
    }
  } else {
    nextSurah = audioState.surah === 114 ? 1 : audioState.surah + 1;
  }
  return nextSurah;
}

async function playCurrentTrack() {
  if (!quranData) {
    updatePlayerStatus("Quran audio is still loading");
    return;
  }
  if (!quranAudio.src) selectAudioTrack(audioState.surah);
  try {
    await quranAudio.play();
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Could not play Quran recitation audio.", error);
    updatePlayerStatus("Unable to play audio. Check your connection.", true);
  }
}

function setPlaybackState(isPlaying) {
  playPauseButton.classList.toggle("is-playing", isPlaying);
  playPauseButton.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${quranData?.surahs[audioState.surah - 1]?.englishName || "Quran recitation"}`);
  playPauseButton.title = isPlaying ? "Pause" : "Play";
}

function playNextTrack() {
  if (!quranData) return;
  const nextSurah = queuedNextSurah ?? chooseNextTrack();
  selectAudioTrack(nextSurah, true);
}

function playPreviousTrack() {
  if (!quranData) return;
  if (quranAudio.currentTime > 3) {
    quranAudio.currentTime = 0;
    return;
  }
  const previousSurah = audioState.surah === 1 ? 114 : audioState.surah - 1;
  selectAudioTrack(previousSurah, true);
}

function initializeAudioPlayer() {
  quranAudio.volume = audioState.volume;
  quranAudio.playbackRate = audioState.rate;
  playbackRate.value = String(audioState.rate);
  playerVolume.value = String(audioState.volume);
  renderPlaylist();
  selectAudioTrack(audioState.surah);
  updatePlaylistSelection();
}

function renderReader() {
  if (!quranData) return;
  let ayahs;
  const heading = createElement("div", "surah-title-row");
  const title = createElement("div");
  if (readerState.mode === "juz") {
    const juz = quranData.juzs[readerState.juz - 1];
    const startSurah = quranData.surahs[juz.start.surah - 1];
    const endSurah = quranData.surahs[juz.end.surah - 1];
    surahSelect.value = `juz:${juz.number}`;
    ayahs = quranData.ayahs.filter(ayah => ayah.juz === juz.number);
    title.append(
      createElement("h2", "", `Sipara ${juz.number} · ${juzNames[juz.number - 1]} · Juz ${juz.number}`),
      createElement("p", "surah-translation", `${ayahs.length} ayahs · ${startSurah.englishName} ${juz.start.ayah} — ${endSurah.englishName} ${juz.end.ayah}`)
    );
    heading.append(title, createElement("p", "surah-arabic-name", `پارہ ${juz.number}`));
    document.querySelector("#previousSurah").disabled = juz.number === 1;
    document.querySelector("#nextSurah").disabled = juz.number === 30;
  } else {
    const surah = quranData.surahs[readerState.surah - 1];
    if (!surah) return;
    surahSelect.value = `surah:${surah.number}`;
    ayahs = surah.ayahs;
    title.append(
      createElement("h2", "", `${surah.number}. ${surah.englishName}`),
      createElement("p", "surah-translation", `${surah.englishNameTranslation} · ${surah.revelationType} · ${surah.numberOfAyahs} ayahs`)
    );
    heading.append(title, createElement("p", "surah-arabic-name", surah.name));
    document.querySelector("#previousSurah").disabled = surah.number === 1;
    document.querySelector("#nextSurah").disabled = surah.number === 114;
  }
  surahHeading.replaceChildren(heading);
  surahHeading.hidden = false;
  searchResults.hidden = true;
  ayahList.hidden = false;

  const fragment = document.createDocumentFragment();
  for (const ayah of ayahs) {
    const key = `${ayah.surah}:${ayah.number}`;
    const card = createElement("article", "ayah-card");
    const top = createElement("div", "ayah-meta");
    top.append(
      createElement("span", "", `${quranData.surahs[ayah.surah - 1].englishName} · Ayah ${ayah.number} · Juz ${ayah.juz}`),
      createElement("span", "ayah-marker", `۞ ${ayah.number} ۞`)
    );
    const text = createElement("p", "ayah-text", ayah.text);
    text.lang = "ar";
    text.dir = "rtl";
    const translation = createElement("p", "ayah-translation", ayah.translation);
    translation.lang = "ur";
    translation.dir = "rtl";
    translation.hidden = !readerState.showTranslation;
    const saved = readerState.readAyahs.has(key);
    const button = createElement("button", `mark-read${saved ? " is-read" : ""}`, saved ? "✓ Read · save place" : "Mark read · save place");
    button.type = "button";
    button.dataset.ayahKey = key;
    button.setAttribute("aria-pressed", String(saved));
    card.append(top, text, translation, button);
    fragment.append(card);
  }
  ayahList.replaceChildren(fragment);
}

function updateReadingProgress() {
  const completed = readerState.readAyahs.size;
  const percentage = Math.round(completed / 6236 * 100);
  quranProgress.value = completed;
  progressPercent.textContent = `${percentage}%`;
  progressDetail.textContent = `${completed.toLocaleString()} of 6,236 ayahs saved as read`;
  if (readerState.lastRead && quranData) {
    const surah = quranData.surahs[readerState.lastRead.surah - 1];
    if (surah && readerState.lastRead.ayah <= surah.numberOfAyahs) {
      resumeReading.hidden = false;
      resumeReading.textContent = `Continue: ${surah.englishName}, ayah ${readerState.lastRead.ayah}`;
      return;
    }
  }
  resumeReading.hidden = true;
}

function normalizeArabic(text) {
  return text.normalize("NFD")
    .replace(/\u0670/g, "ا")
    .replace(/[\u0640\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function searchQuran(query) {
  const term = normalizeArabic(query);
  searchResults.replaceChildren();
  if (term.length < 2) {
    searchResults.append(createElement("p", "search-empty", "Enter at least two Arabic letters to search."));
    searchResults.hidden = false;
    ayahList.hidden = true;
    surahHeading.hidden = true;
    return;
  }

  let totalMatches = 0;
  const results = document.createDocumentFragment();
  for (const ayah of quranData.ayahs) {
    if (!normalizeArabic(ayah.text).includes(term)) continue;
    totalMatches += 1;
    if (totalMatches > 50) continue;
    const surah = quranData.surahs[ayah.surah - 1];
    const result = document.createElement("button");
    result.type = "button";
    result.className = "search-result";
    result.dataset.surah = String(ayah.surah);
    result.dataset.ayah = String(ayah.number);
    result.append(
      createElement("span", "search-result-title", `${surah.englishName} · Ayah ${ayah.number}`),
      createElement("span", "search-result-text", ayah.text),
      createElement("span", "search-result-translation", ayah.translation)
    );
    results.append(result);
  }

  if (totalMatches === 0) results.append(createElement("p", "search-empty", "No matching ayahs found. Try another Arabic word."));
  else if (totalMatches > 50) results.append(createElement("p", "search-hint", `Showing first 50 of ${totalMatches} matches.`));
  searchResults.append(results);
  searchResults.hidden = false;
  ayahList.hidden = true;
  surahHeading.hidden = true;
}

function render() {
  countOutput.textContent = state.count.toLocaleString();
  remainingOutput.textContent = Math.max(0, state.goal - state.count).toLocaleString();
  dhikrDisplay.textContent = state.dhikr;
  const counterContent = dhikrDisplay.parentElement;
  counterContent.classList.toggle("is-long", state.dhikr.length > 45 && state.dhikr.length <= 200);
  counterContent.classList.toggle("is-very-long", state.dhikr.length > 200);
  dhikrSelect.value = state.dhikr;
  goalSelect.value = [33, 99, 100].includes(state.goal) ? String(state.goal) : "custom";
  progressRing.style.setProperty("--progress", `${Math.min(state.count / state.goal, 1) * 100}%`);
  const vibrationButton = document.querySelector("#soundButton");
  vibrationButton.classList.toggle("is-active", state.vibration);
  vibrationButton.setAttribute("aria-label", state.vibration ? "Turn vibration off" : "Turn vibration on");
  vibrationButton.title = state.vibration ? "Vibration on" : "Vibration off";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

document.querySelector("#countButton").addEventListener("click", () => {
  state.count += 1;
  saveState();
  render();
  if (state.vibration && "vibrate" in navigator) navigator.vibrate(18);
  if (state.count === state.goal) showToast("Alhamdulillah — your goal is complete.");
});

document.querySelector("#resetButton").addEventListener("click", () => {
  if (state.count === 0) return;
  state.count = 0;
  saveState();
  render();
  showToast("Count reset.");
});

dhikrSelect.addEventListener("change", () => {
  state.counts[state.dhikr] = state.count;
  state.dhikr = dhikrSelect.value;
  state.count = state.counts[state.dhikr] || 0;
  saveState();
  render();
});

goalSelect.addEventListener("change", () => {
  if (goalSelect.value === "custom") {
    const input = window.prompt("Enter your daily goal (1–100,000):", String(state.goal));
    if (input === null) {
      render();
      return;
    }
    const customGoal = Number(input);
    if (!Number.isSafeInteger(customGoal) || customGoal < 1 || customGoal > 100000) {
      render();
      showToast("Please enter a whole number from 1 to 100,000.");
      return;
    }
    state.goal = customGoal;
  } else {
    state.goal = Number(goalSelect.value);
  }
  saveState();
  render();
});

document.querySelector("#soundButton").addEventListener("click", () => {
  state.vibration = !state.vibration;
  saveState();
  render();
  showToast(state.vibration ? "Vibration turned on." : "Vibration turned off.");
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    showToast("Open the HTTPS app link in Chrome (Android) or Safari (iPhone) to install.");
    return;
  }
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  if (choice.outcome === "accepted") showToast("Tasbih is being installed.");
  installPrompt = null;
});

window.addEventListener("appinstalled", () => showToast("Tasbih installed successfully."));

playPauseButton.addEventListener("click", () => {
  if (quranAudio.paused) playCurrentTrack();
  else quranAudio.pause();
});

document.querySelector("#previousTrackButton").addEventListener("click", playPreviousTrack);
document.querySelector("#nextTrackButton").addEventListener("click", playNextTrack);

document.querySelector("#rewindButton").addEventListener("click", () => {
  if (Number.isFinite(quranAudio.duration)) quranAudio.currentTime = Math.max(0, quranAudio.currentTime - 10);
});

document.querySelector("#forwardButton").addEventListener("click", () => {
  if (Number.isFinite(quranAudio.duration)) quranAudio.currentTime = Math.min(quranAudio.duration, quranAudio.currentTime + 10);
});

shuffleButton.addEventListener("click", () => {
  audioState.shuffle = !audioState.shuffle;
  preloadNextTrack();
  shuffleButton.classList.toggle("is-active", audioState.shuffle);
  shuffleButton.setAttribute("aria-label", `Shuffle ${audioState.shuffle ? "on" : "off"}`);
  shuffleButton.title = `Shuffle ${audioState.shuffle ? "on" : "off"}`;
  saveAudioState();
});

repeatButton.addEventListener("click", () => {
  audioState.repeat = (audioState.repeat + 1) % 3;
  preloadNextTrack();
  const repeatLabel = ["off", "all", "one"][audioState.repeat];
  repeatButton.classList.toggle("is-active", audioState.repeat !== 0);
  repeatButton.setAttribute("aria-label", `Repeat ${repeatLabel}`);
  repeatButton.title = `Repeat ${repeatLabel}`;
  repeatOneBadge.hidden = audioState.repeat !== 2;
  saveAudioState();
});

playlistItems.addEventListener("click", event => {
  const track = event.target.closest("button[data-surah]");
  if (!track) return;
  selectAudioTrack(Number(track.dataset.surah), true);
});

playerSeek.addEventListener("input", () => {
  if (!Number.isFinite(quranAudio.duration)) return;
  quranAudio.currentTime = Number(playerSeek.value) / 1000 * quranAudio.duration;
  updateAudioProgress();
});

playbackRate.addEventListener("change", () => {
  audioState.rate = Number(playbackRate.value);
  quranAudio.playbackRate = audioState.rate;
  saveAudioState();
});

playerVolume.addEventListener("input", () => {
  audioState.volume = Number(playerVolume.value);
  quranAudio.volume = audioState.volume;
});

playerVolume.addEventListener("change", saveAudioState);
quranAudio.addEventListener("timeupdate", updateAudioProgress);
quranAudio.addEventListener("loadedmetadata", updateAudioProgress);
quranAudio.addEventListener("durationchange", updateAudioProgress);
quranAudio.addEventListener("loadstart", () => updatePlayerStatus("Loading audio…"));
quranAudio.addEventListener("canplay", () => {
  if (quranAudio.paused) updatePlayerStatus("Ready to play");
});
quranAudio.addEventListener("play", () => {
  setPlaybackState(true);
  updatePlayerStatus("Playing");
});
quranAudio.addEventListener("pause", () => {
  setPlaybackState(false);
  if (!quranAudio.ended && !quranAudio.error) updatePlayerStatus("Paused");
});
quranAudio.addEventListener("ended", () => {
  setPlaybackState(false);
  if (audioState.repeat === 2) {
    quranAudio.currentTime = 0;
    playCurrentTrack();
  } else if (audioState.repeat === 1 || audioState.shuffle || audioState.surah < 114) {
    playNextTrack();
  } else {
    updatePlayerStatus("Surah complete");
  }
});
quranAudio.addEventListener("error", () => {
  console.error("Quran recitation audio failed to load.", quranAudio.error);
  updatePlayerStatus("Audio unavailable. Check your connection.", true);
});

shuffleButton.classList.toggle("is-active", audioState.shuffle);
shuffleButton.setAttribute("aria-label", `Shuffle ${audioState.shuffle ? "on" : "off"}`);
shuffleButton.title = `Shuffle ${audioState.shuffle ? "on" : "off"}`;
repeatButton.classList.toggle("is-active", audioState.repeat !== 0);
repeatButton.setAttribute("aria-label", `Repeat ${["off", "all", "one"][audioState.repeat]}`);
repeatButton.title = `Repeat ${["off", "all", "one"][audioState.repeat]}`;
repeatOneBadge.hidden = audioState.repeat !== 2;

render();

playerTab.addEventListener("click", () => setActiveView("player"));
tasbihTab.addEventListener("click", () => setActiveView("tasbih"));
quranTab.addEventListener("click", () => setActiveView("quran"));
document.querySelector(".brand").addEventListener("click", event => {
  event.preventDefault();
  setActiveView("player");
});

surahSelect.addEventListener("change", () => {
  const [mode, number] = surahSelect.value.split(":");
  readerState.mode = mode;
  if (mode === "juz") readerState.juz = Number(number);
  else readerState.surah = Number(number);
  saveReaderState();
  renderReader();
});

document.querySelector("#previousSurah").addEventListener("click", () => {
  if (readerState.mode === "juz" && readerState.juz > 1) {
    readerState.juz -= 1;
  } else if (readerState.mode === "surah" && readerState.surah > 1) {
    readerState.surah -= 1;
  } else {
    return;
  }
  saveReaderState();
  renderReader();
});

document.querySelector("#nextSurah").addEventListener("click", () => {
  if (readerState.mode === "juz" && readerState.juz < 30) {
    readerState.juz += 1;
  } else if (readerState.mode === "surah" && readerState.surah < 114) {
    readerState.surah += 1;
  } else {
    return;
  }
  saveReaderState();
  renderReader();
});

translationToggle.addEventListener("change", () => {
  readerState.showTranslation = translationToggle.checked;
  saveReaderState();
  quranView.querySelectorAll(".ayah-translation, .search-result-translation").forEach(translation => {
    translation.hidden = !readerState.showTranslation;
  });
});

document.querySelector("#quranSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  if (quranData) searchQuran(quranSearch.value);
});

searchResults.addEventListener("click", event => {
  const result = event.target.closest("button[data-surah]");
  if (!result || !quranData) return;
  readerState.surah = Number(result.dataset.surah);
  readerState.mode = "surah";
  quranSearch.value = "";
  saveReaderState();
  renderReader();
  requestAnimationFrame(() => {
    const ayah = ayahList.querySelector(`[data-ayah-key="${readerState.surah}:${Number(result.dataset.ayah)}"]`);
    ayah?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

ayahList.addEventListener("click", event => {
  const button = event.target.closest("button[data-ayah-key]");
  if (!button) return;
  const [surah, ayah] = button.dataset.ayahKey.split(":").map(Number);
  if (!readerState.readAyahs.has(button.dataset.ayahKey)) readerState.readAyahs.add(button.dataset.ayahKey);
  readerState.lastRead = { surah, ayah };
  readerState.surah = surah;
  saveReaderState();
  updateReadingProgress();
  button.classList.add("is-read");
  button.textContent = "✓ Read · save place";
  button.setAttribute("aria-pressed", "true");
});

resumeReading.addEventListener("click", () => {
  if (!readerState.lastRead || !quranData) return;
  readerState.surah = readerState.lastRead.surah;
  readerState.mode = "surah";
  saveReaderState();
  renderReader();
  requestAnimationFrame(() => {
    const ayah = ayahList.querySelector(`[data-ayah-key="${readerState.lastRead.surah}:${readerState.lastRead.ayah}"]`);
    ayah?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

setActiveView("player");

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.error("Could not register the offline app service worker.", error);
    });
  });
}
