// State aplikasi
let state = {
  soalIndex: 0,
  skor: 0,
  maxSkor: 0,
  timerId: null,
  waktuTersisa: 30,
  soalAktif: null,
  sedangPeriksa: false,
};

// Referensi elemen layar
const screens = {
  menu: document.getElementById("screen-menu"),
  materi: document.getElementById("screen-materi"),
  cara: document.getElementById("screen-cara"),
  game: document.getElementById("screen-game"),
  hasil: document.getElementById("screen-hasil"),
};

// Referensi elemen UI
const el = {
  soalNum: document.getElementById("soal-num"),
  soalTotal: document.getElementById("soal-total"),
  timer: document.getElementById("timer"),
  skor: document.getElementById("skor"),
  progressFill: document.getElementById("progress-fill"),
  bankKata: document.getElementById("bank-kata"),
  areaJawaban: document.getElementById("area-jawaban"),
  feedback: document.getElementById("feedback"),
  hasilSkor: document.getElementById("hasil-skor"),
  hasilMax: document.getElementById("hasil-max"),
  bintang: document.getElementById("bintang"),
  hasilPesan: document.getElementById("hasil-pesan"),
  highscoreValue: document.getElementById("highscore-value"),
};

// ==========================================
// SISTEM AUDIO (Web Audio API)
// ==========================================
let audioCtx;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// 1. Suara jika kata belum lengkap (Peringatan)
function playSoundIncomplete() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);

  // Bip kedua
  setTimeout(() => {
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(400, audioCtx.currentTime);
    gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc2.start();
    osc2.stop(audioCtx.currentTime + 0.15);
  }, 200);
}

// 2. Suara jika jawaban salah
function playSoundWrong() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
  
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// 3. Suara jika jawaban benar
function playSoundCorrect() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// 4. Suara saat selesai bermain (Fanfare)
function playSoundFinish() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const notes = [523.25, 659.25, 783.99, 1046.50]; // Nada C5, E5, G5, C6
  notes.forEach((freq, index) => {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'square';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }, index * 150);
  });
}
// ==========================================

// Tampilkan layar
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// Acak array
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Muat skor tertinggi
function loadHighscore() {
  const hs = localStorage.getItem("susunkata_highscore") || 0;
  el.highscoreValue.textContent = hs;
}

// Tampilkan feedback
function feedback(msg, tipe) {
  el.feedback.textContent = msg;
  el.feedback.className = `feedback ${tipe || ""}`;
}

// Bersihkan feedback
function clearFeedback() {
  el.feedback.textContent = "";
  el.feedback.className = "feedback";
}

// Mulai permainan
function mulaiPermainan() {
  initAudio(); // Aktifkan audio context pada interaksi pertama user
  state.soalIndex = 0;
  state.skor = 0;
  state.maxSkor = daftarSoal.length * 100;
  state.sedangPeriksa = false;

  el.soalTotal.textContent = daftarSoal.length;
  el.skor.textContent = "0";
  clearFeedback();

  showScreen("game");
  muatSoal();
}

// Muat soal
function muatSoal() {
  clearInterval(state.timerId);
  state.waktuTersisa = 30;
  state.sedangPeriksa = false;
  el.timer.textContent = state.waktuTersisa;
  clearFeedback();

  const soal = daftarSoal[state.soalIndex];
  state.soalAktif = soal;

  el.soalNum.textContent = state.soalIndex + 1;
  el.progressFill.style.width = `${(state.soalIndex / daftarSoal.length) * 100}%`;

  el.bankKata.querySelectorAll(".kata").forEach((k) => k.remove());
  el.areaJawaban.querySelectorAll(".kata").forEach((k) => k.remove());

  const kataArray = shuffle(soal.kalimatBenar.split(" "));
  kataArray.forEach((kata) => {
    const chip = buatChipKata(kata);
    el.bankKata.appendChild(chip);
  });

  startTimer();
}

// Buat chip kata
function buatChipKata(kata) {
  const chip = document.createElement("div");
  chip.className = "kata";
  chip.dataset.kata = kata;
  chip.textContent = kata;
  chip.addEventListener("click", () => pindahKata(chip));
  return chip;
}

// Pindah kata saat diklik
function pindahKata(chip) {
  if (state.sedangPeriksa) return;

  // Hapus class sementara jika user berinteraksi
  chip.classList.remove("benar", "salah");

  const parent = chip.parentElement;

  if (parent === el.bankKata) {
    el.areaJawaban.appendChild(chip);
    clearFeedback();
  } else if (parent === el.areaJawaban) {
    el.bankKata.appendChild(chip);
    clearFeedback();
  }
}

// Mulai timer
function startTimer() {
  state.timerId = setInterval(() => {
    state.waktuTersisa--;
    el.timer.textContent = state.waktuTersisa;
    if (state.waktuTersisa <= 0) {
      clearInterval(state.timerId);
      feedback("Waktu habis! Lanjut soal berikutnya.", "salah");
      playSoundWrong(); // Bunyi waktu habis
      setTimeout(() => nextSoal(), 1500);
    }
  }, 1000);
}

// Periksa jawaban
function periksaJawaban() {
  if (state.sedangPeriksa) return;
  state.sedangPeriksa = true;
  clearInterval(state.timerId);

  const kataDiJawaban = [...el.areaJawaban.querySelectorAll(".kata")];
  const kataDiBank = [...el.bankKata.querySelectorAll(".kata")];
  const kataBenarArray = state.soalAktif.kalimatBenar.split(" ");

  // Validasi: masih ada kata di bank?
  if (kataDiBank.length > 0) {
    feedback(`Masih ada ${kataDiBank.length} kata di Bank Kata. Pindahkan semua dulu!`, "info");
    playSoundIncomplete(); // AUDIO: Belum diisi lengkap
    state.sedangPeriksa = false;
    startTimer();
    return;
  }

  // Validasi: area jawaban kosong?
  if (kataDiJawaban.length === 0) {
    feedback("Kamu belum menyusun kata apa pun!", "info");
    playSoundIncomplete(); // AUDIO: Belum diisi lengkap
    state.sedangPeriksa = false;
    startTimer();
    return;
  }

  // Validasi: jumlah kata di jawaban harus sesuai
  if (kataDiJawaban.length !== kataBenarArray.length) {
    feedback(`Jumlah kata belum sesuai. Target ${kataBenarArray.length} kata, saat ini ${kataDiJawaban.length}.`, "info");
    playSoundIncomplete(); // AUDIO: Belum diisi lengkap
    state.sedangPeriksa = false;
    startTimer();
    return;
  }

  // Cek apakah semua kata sudah di posisi benar
  let jumlahBenar = 0;
  kataDiJawaban.forEach((k, i) => {
    k.classList.remove("benar", "salah");
    if (k.dataset.kata === kataBenarArray[i]) {
      k.classList.add("benar");
      jumlahBenar++;
    } else {
      k.classList.add("salah");
    }
  });

  // Jika semua benar
  if (jumlahBenar === kataBenarArray.length) {
    const bonusWaktu = state.waktuTersisa;
    const skorDidapat = 100 + bonusWaktu;
    state.skor += skorDidapat;
    el.skor.textContent = state.skor;

    feedback(`Benar! +${skorDidapat} poin (bonus waktu +${bonusWaktu})`, "benar");
    playSoundCorrect(); // AUDIO: Jawaban Benar

    setTimeout(() => {
      state.sedangPeriksa = false;
      nextSoal();
    }, 1800);
    return;
  }

  // JIKA SALAH: pesan singkat, biarkan warna chip yang memberi tahu
  feedback(`${jumlahBenar} dari ${kataBenarArray.length} kata sudah benar.`, "salah");
  playSoundWrong(); // AUDIO: Jawaban Salah

  // Efek warna sementara: hapus class setelah 1.5 detik
  setTimeout(() => {
    kataDiJawaban.forEach((k) => k.classList.remove("benar", "salah"));
    state.sedangPeriksa = false;
    if (state.waktuTersisa > 0) startTimer();
  }, 1500);
}

// Ulangi soal (reset total)
function ulangiSoal() {
  if (state.sedangPeriksa) return;

  clearInterval(state.timerId);
  state.sedangPeriksa = false;
  state.waktuTersisa = 30;
  el.timer.textContent = state.waktuTersisa;
  clearFeedback();

  // Kembalikan semua kata ke bank kata, hapus tanda benar/salah
  el.areaJawaban.querySelectorAll(".kata").forEach((k) => {
    k.classList.remove("benar", "salah");
    el.bankKata.appendChild(k);
  });

  el.bankKata.querySelectorAll(".kata").forEach((k) => {
    k.classList.remove("benar", "salah");
  });

  // Acak ulang
  const chips = [...el.bankKata.querySelectorAll(".kata")];
  shuffle(chips).forEach((chip) => el.bankKata.appendChild(chip));

  feedback("Soal diulang dari awal.", "info");
  setTimeout(clearFeedback, 1200);
  startTimer();
}

// Lanjut ke soal berikutnya
function nextSoal() {
  state.soalIndex++;
  if (state.soalIndex >= daftarSoal.length) {
    selesaiPermainan();
  } else {
    muatSoal();
  }
}

// Selesai permainan
function selesaiPermainan() {
  clearInterval(state.timerId);
  el.progressFill.style.width = "100%";

  el.hasilSkor.textContent = state.skor;
  el.hasilMax.textContent = state.maxSkor;

  const persen = state.skor / state.maxSkor;
  let bintang = "★";
  let pesan = "Terus berlatih ya!";
  if (persen >= 0.4) {
    bintang = "★★";
    pesan = "Bagus, terus tingkatkan!";
  }
  if (persen >= 0.7) {
    bintang = "★★★";
    pesan = "Hebat! Kamu sudah paham.";
  }
  if (persen >= 0.9) {
    bintang = "★★★★";
    pesan = "Luar biasa! Hampir sempurna!";
  }

  el.bintang.textContent = bintang;
  el.hasilPesan.textContent = pesan;

  const hs = parseInt(localStorage.getItem("susunkata_highscore") || 0);
  if (state.skor > hs) {
    localStorage.setItem("susunkata_highscore", state.skor);
  }
  loadHighscore();

  showScreen("hasil");
  playSoundFinish(); // AUDIO: Selesai Bermain
}

// Keluar ke menu
function keluarKeMenu() {
  const konfirmasi = confirm("Yakin mau keluar ke Menu Utama?\nProgres permainan akan hilang.");
  if (!konfirmasi) return;

  clearInterval(state.timerId);
  state.sedangPeriksa = false;
  loadHighscore();
  showScreen("menu");
}

// Event listener
function bindEvents() {
  document.getElementById("btn-materi").addEventListener("click", () => showScreen("materi"));
  document.getElementById("btn-mulai").addEventListener("click", mulaiPermainan);
  document.getElementById("btn-cara").addEventListener("click", () => showScreen("cara"));
  document.getElementById("btn-kembali-cara").addEventListener("click", () => showScreen("menu"));
  document.getElementById("btn-kembali-materi").addEventListener("click", () => showScreen("menu"));
  document.getElementById("btn-mulai-dari-materi").addEventListener("click", mulaiPermainan);
  document.getElementById("btn-periksa").addEventListener("click", periksaJawaban);
  document.getElementById("btn-ulangi").addEventListener("click", ulangiSoal);
  document.getElementById("btn-lewati").addEventListener("click", () => {
    if (state.sedangPeriksa) return;
    clearInterval(state.timerId);
    feedback("Soal dilewati.", "info");
    setTimeout(() => nextSoal(), 800);
  });
  document.getElementById("btn-menu-game").addEventListener("click", keluarKeMenu);
  document.getElementById("btn-main-lagi").addEventListener("click", mulaiPermainan);
  document.getElementById("btn-menu-utama").addEventListener("click", () => {
    loadHighscore();
    showScreen("menu");
  });
}

// Inisialisasi
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadHighscore();
  showScreen("menu");
});
