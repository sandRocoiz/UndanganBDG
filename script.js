// === 1. KONSTANTA DAN UTILITAS ===
const endpoint = "https://undangan-bdg.vercel.app/api/proxy";
const endpointvoice = "https://undangan-bdg.vercel.app";
const perPage = 5;
let currentPage = 1;
const maxWinners = 10;
const hadiahKey = "scratchWin";
const namaReservasiKey = "namaReservasi";




// === POLLING CONTROL ===
let pollingInterval = null;
let lastTotalUcapan = 0;

//SNW
let scratchFinished = false;

//Voice Note
let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let recordTimer;
let elapsedSeconds = 0;
let isPaused = false;

//wave
let audioContext;
let analyser;
let dataArray;
let animationId;
let canvas;
let canvasCtx;
let waveInterval;
let sourceNode, analyserNode, animationFrameId;

let recordingAllowed = false;



const startBtn = document.getElementById('startVoiceButton');
const cancelBtn = document.getElementById('cancelVoice');
const pauseBtn = document.getElementById('pauseVoice');
const sendBtn = document.getElementById('sendVoice');
const timerDisplay = document.getElementById('timerVoice');
const sheetVoice = document.getElementById('voiceRecorderSheet');
const replayAudio = document.getElementById('replayAudio');
const replayBtn = document.getElementById('replayVoice');

const bgm = document.getElementById("bgm");

function setRealVh() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setRealVh);
setRealVh();

// === USER ID ===
function generateUserId() {
  const id = "usr_" + Math.random().toString(36).substring(2, 11);
  localStorage.setItem("userId", id);
  return id;
}

function getUserId() {
  return localStorage.getItem("userId") || generateUserId();
}

// === FORMAT WAKTU ===
function formatWaktuIndo(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Waktu tidak diketahui";
  const tanggal = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const waktu = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${tanggal}, ${waktu} WIB`;
}

// === CEK KELAYAKAN SCRATCH CARD ===
function isEligibleForScratch() {
  const status = localStorage.getItem("reservasiStatus");
  return status === "datang";
}

// === 2. SPLASH & INVITATION HANDLING ===
function openInvitation() {
  sessionStorage.setItem("invitationOpened", "true");
  

  document.getElementById('splash').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';

  startCountdown();
  ambilUcapan();
  animateLetterDropById("weddingNames");

  playBGM(); // ✅ Musik baru nyala saat masuk mainContent
}


// === 3. COUNTDOWN HANDLER ===
function startCountdown() {
  const countdownEl = document.getElementById('countdown');
  const target = new Date('2025-06-13T10:00:00').getTime();
  const interval = setInterval(() => {
    const now = Date.now();
    const diff = target - now;
	
    if (diff <= 0) {
      clearInterval(interval);
      countdownEl.innerHTML = "Countdown telah berakhir.";
      return;
    }
	
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    countdownEl.innerHTML = `${d} hari ${h} jam ${m} menit ${s} detik`;
  }, 1000);
}

// === 4. UCAPAN (SUBMIT - AMBIL - RENDER - LIKE) ===
function ambilUcapan() {
  const daftar = document.getElementById("daftarUcapan") || { innerHTML: "" };
  const filterCheckbox = document.getElementById("filterByUser");
  const filterAktif = filterCheckbox?.checked;
  const url = new URL(endpoint);

  if (!filterAktif) {
    url.searchParams.set("limit", perPage);
    url.searchParams.set("page", currentPage);
    url.searchParams.set("actionType", "filterUnchecked");
  } else {
    url.searchParams.set("actionType", "filterChecked");
  }

  // ✨ GANTI ISI daftarUcapan dengan skeleton box dulu
  daftar.innerHTML = generateSkeletonCards(4); // 4 dummy card

  fetch(url.toString())
    .then(res => res.json())
    .then(result => {
      const semuaData = Array.isArray(result) ? result : result.data || [];
      renderUcapan(semuaData, result.total || semuaData.length);
    })
    .catch(err => console.error("Gagal ambil ucapan:", err));
}

// ✨ Function generate skeleton dummy
function generateSkeletonCards(jumlah) {
  let skeletonHTML = "";
  for (let i = 0; i < jumlah; i++) {
    skeletonHTML += `
      <div class="skeleton-card">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    `;
  }
  return skeletonHTML;
}










// === SUBMIT UCAPAN ===
function submitUcapan(e) {
  e.preventDefault();

  if (localStorage.getItem("sudahSubmitUcapan") === "true") {
    tampilkanUcapanSudahSubmit();
    return;
  }

  const nama = e.target.nama.value.trim();
  const ucapan = e.target.ucapan.value.trim();
  const userId = getUserId();

  if (!nama || !ucapan) {
    tampilkanStatusMsg("ucapanStatusMsg", "Nama dan ucapan wajib diisi.", "error");
    return;
  }

  const countdownTarget = new Date('2025-06-13T10:00:00').getTime();
  if (Date.now() >= countdownTarget) {
    tampilkanStatusMsg("ucapanStatusMsg", "Ucapan sudah ditutup.", "error");
    return;
  }

  localStorage.setItem("nama", nama);

  const form = new URLSearchParams();
  form.append("nama", nama);
  form.append("ucapan", ucapan);
  form.append("userId", userId);
  form.append("is_ucapan", "true");

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  })
  .then(res => res.text())
  .then(text => {
    if (text.trim() === "OK") {
      localStorage.setItem("sudahSubmitUcapan", "true");
      tampilkanUcapanSudahSubmit();
	  showToast("Ucapan berhasil dikirim! 🎉", "success");
      e.target.reset();
      ambilUcapan();
      cekHadiahSetelahUcapan();
    } else if (text.trim() === "ALREADY_SENT") {
      tampilkanUcapanSudahSubmit();
    } else {
      tampilkanStatusMsg("ucapanStatusMsg", "Terjadi kesalahan saat mengirim.", "error");
    }
  })
  .catch(err => {
    console.error("Gagal mengirim ucapan:", err);
    tampilkanStatusMsg("ucapanStatusMsg", "Koneksi gagal, coba lagi.", "error");
  });
}


function tampilkanUcapanSudahSubmit() {
  const formUcapan = document.getElementById("formUcapan");
  const ucapanStatus = document.getElementById("ucapanStatusMsg");
  const ucapanThanks = document.getElementById("ucapanThanks");

  if (formUcapan) {
    formUcapan.style.display = "none"; // Hide form ucapan
    formUcapan.style.visibility = "hidden"; // Tambahan
    formUcapan.style.height = "0"; // Tambahan
    formUcapan.style.overflow = "hidden"; // Tambahan
  }

  if (ucapanThanks) {
    ucapanThanks.style.display = "block"; // Show thank you
  }

  if (ucapanStatus) {
    ucapanStatus.style.display = "none"; // hide status message
  }
  
  formUcapan.classList.add("hidden");
}





// Fungsi bantu untuk tampilkan pesan dengan efek fade-in
function tampilkanStatusMsg(idElement, pesan, tipe = "success") {
  const el = document.getElementById(idElement);
  if (!el) return;
  el.textContent = pesan;
  el.classList.remove("success", "error", "show");
  el.classList.add(tipe, "show");
  
  showToast(pesan, tipe);
  
}



// ============================================
// FINAL PATCH: SCRATCH CARD SYSTEM CLEAN VERSION
// ============================================

// Fungsi setelah submit ucapan (untuk cek hadiah)
async function cekHadiahSetelahUcapan() {
  const userId = getUserId();
  try {
    const res = await fetch(`${endpoint}?action=checkPrize&userId=${userId}`);
    const result = await res.json();

    if (result.error) {
      console.error("Gagal cek prize:", result.error);
      return;
    }

    const menang = result.winner === true;
    localStorage.setItem("scratchResult", menang ? "MENANG" : "KALAH");

    if (menang) {
      const form = new URLSearchParams();
      form.append("action", "win"); // <== penting!
      form.append("userId", userId);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString()
        });

        const text = await res.text();
        console.log("Update Winner Response:", text);

      } catch (err) {
        console.error("Gagal update winner ke server:", err);
      }
    }

    bukaScratchCard();

  } catch (err) {
    console.error("Gagal fetch cek prize:", err);
  }
}


// Fungsi membuka Scratch Card
function bukaScratchCard() {
  const sheet = document.getElementById('bottomSheetScratch');
  const rewardImage = document.getElementById('scratchRewardImage');
  const resultText = document.getElementById('scratchResultText');
  const canvas = document.getElementById('scratchCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!sheet || !rewardImage || !canvas || !ctx) {
    console.error("❗ Ada elemen ScratchCard yang tidak ditemukan!");
    return;
  }

  const menang = localStorage.getItem("scratchResult") === "MENANG";

  rewardImage.src = menang
    ? "https://undangan-bdg.vercel.app/Asset/win.png"
    : "https://undangan-bdg.vercel.app/Asset/lose.png";

  // ✅ Set teks instruksi awal
  resultText.innerHTML = "";
  resultText.style.display = "none";

  // 🔥 Buka BottomSheet Scratch dengan animasi
  sheet.classList.remove('hidden');
  setTimeout(() => {
    sheet.classList.add('active');
    vibrateShort();
  }, 10);

  rewardImage.onload = () => {
    canvas.width = rewardImage.offsetWidth;
    canvas.height = rewardImage.offsetHeight;

    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-out";

    setupScratchEvents();
  };

  let isDrawing = false;
  

  function setupScratchEvents() {
    const scratchSound = new Audio("https://undangan-bdg.vercel.app/Asset/scratch-sound.mp3");
    scratchSound.loop = true;
    scratchSound.volume = 0.3;

    // MOUSE
    canvas.addEventListener('mousedown', () => {
      isDrawing = true;
      scratchSound.play().catch(() => {});
    });

    canvas.addEventListener('mouseup', () => {
      isDrawing = false;
      scratchSound.pause();
    });

    canvas.addEventListener('mousemove', scratch);

    // TOUCH (Mobile)
    canvas.addEventListener('touchstart', () => {
      isDrawing = true;
      scratchSound.play().catch(() => {});
    });

    canvas.addEventListener('touchend', () => {
      isDrawing = false;
      scratchSound.pause();
    });

    canvas.addEventListener('touchmove', scratch);
  }

function scratch(e) {
  if (!isDrawing) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
  const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let cleared = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    if (imgData.data[i + 3] === 0) cleared++;
  }
  const percent = (cleared / (canvas.width * canvas.height)) * 100;

  const progressDisplay = document.getElementById('scratchProgress');
  if (progressDisplay) {
    progressDisplay.innerText = `Progress: ${percent.toFixed(1)}%`;
  }

  if (percent > 50 && !scratchFinished) {
    // ✨ Set LANGSUNG scratchFinished = true!
    scratchFinished = true;

    // ✨ Baru jalanin finishScratch() terpisah
    setTimeout(() => {
      finishScratch();
    }, 300); // kasih delay dikit biar animasi enak
  }
}


  function finishScratch() {
  scratchFinished = true; // 🔥 Force set saat finish
  canvas.style.pointerEvents = "none";

  setTimeout(() => {
    canvas.style.transition = "opacity 0.5s ease";
    canvas.style.opacity = "0";

    setTimeout(() => {
      resultText.innerHTML = menang
        ? `<div class="scratch-message">
             🎉 <strong>Wuihh, Selamat!</strong><br>
             Kamu dapetin <strong>Souvenir Eksklusif</strong> dari kami! 🎁<br>
             📸 <small>Jangan lupa screenshot layar ini & tunjukin ke panitia ya!</small>
           </div>`
        : `<div class="scratch-message">
             😢 <em>Belum hoki nih!</em><br>
             🎉 Tetap makasih banyak udah ikut seru-seruan bareng! 💖
           </div>`;
      resultText.style.display = "block";

      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(menang ? [100, 50, 100] : 50);
      }

      if (menang) {
        sheet.classList.add('scratch-flash-win');
        playSound('https://undangan-bdg.vercel.app/Asset/win-sound.mp3');
      } else {
        playSound('https://undangan-bdg.vercel.app/Asset/lose-sound.mp3');
      }

    }, 500);
  }, 300);
}

  
}





function playSound(url) {
  const audio = new Audio(url);

  if (document.readyState === "complete" && document.hasFocus()) {
    audio.volume = 0;
    audio.play().then(() => {
      let vol = 0;
      const fade = setInterval(() => {
        if (vol < 0.8) {
          vol += 0.05;
          audio.volume = Math.min(vol, 0.8);
        } else {
          clearInterval(fade);
        }
      }, 50);

      // Optional: auto-destroy element on end
      audio.onended = () => {
        audio.remove(); // cleanup
      };
    }).catch(err => {
      console.warn("Audio play blocked:", err);
    });
  } else {
    console.warn("User belum interaksi, audio play dibatalkan.");
  }
}















// === 6. FORM RESERVASI ===
document.getElementById("formReservasi").addEventListener("submit", async function (e) {
  e.preventDefault();

  if (localStorage.getItem("sudahReservasi") === "true") {
    tampilkanReservasiSudahSubmit();
    showToast("Kamu sudah konfirmasi reservasi sebelumnya! 🙌", "success");
    return;
  }

  const nama = document.getElementById("namaReservasi").value.trim();
  const status = document.getElementById("statusReservasi").value;

  if (!nama || !status) {
    showToast("Mohon isi nama dan status kehadiran! ❌", "error");
    return;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "reservasi",
        nama,
        status,
        userId: getUserId(),
      })
    });

    const text = await res.text();

    if (text.trim() === "OK") {
      localStorage.setItem("namaReservasi", nama);
      localStorage.setItem("reservasiStatus", status);
      localStorage.setItem("sudahReservasi", "true");

      if (localStorage.getItem("sudahSubmitUcapan") !== "true" && document.getElementById("nama")) {
        document.getElementById("nama").value = nama;
        localStorage.setItem("nama", nama);
      }

      tampilkanReservasiSudahSubmit();
      showToast("Konfirmasi kehadiran berhasil! 🎉", "success");
      this.reset();

    } else if (text.trim() === "ALREADY_RESERVED") {
      localStorage.setItem("sudahReservasi", "true");
      tampilkanReservasiSudahSubmit();
      showToast("Kamu sudah konfirmasi sebelumnya! 🤝", "success");

    } else {
      showToast("Gagal menyimpan reservasi. ❌", "error");
    }

  } catch (err) {
    console.error("Error submit reservasi:", err);
    showToast("Terjadi kesalahan koneksi. ❌", "error");
  }
});



function tampilkanReservasiSudahSubmit() {
  const formReservasi = document.getElementById("formReservasi");
  const reservasiStatus = document.getElementById("statusReservasiMsg");
  const reservasiThanks = document.getElementById("reservasiThanks");

  if (formReservasi && reservasiThanks) {
    formReservasi.style.display = "none"; // Hide form
    reservasiThanks.style.display = "block"; // Show thank you
  }

  if (reservasiStatus) {
    reservasiStatus.style.display = "none"; // hide status msg
  }
}















// === RENDER UCAPAN ===
function renderUcapan(data, totalUcapan = 0) {
  const daftar = document.getElementById("daftarUcapan");
  const userId = getUserId();
  const filterCheckbox = document.getElementById("filterByUser");
  const filterAktif = filterCheckbox?.checked;
  const threads = {};

  data.forEach(item => {
    const threadId = item.thread ?? item.id;
    if (!threads[threadId]) threads[threadId] = [];
    threads[threadId].push(item);
  });

  const filteredThreads = Object.entries(threads).filter(([_, messages]) => {
  if (filterAktif) {
    // Kalau filter aktif, cari thread dimana userId user itu ada di kepala ucapan
    const head = messages.find(m => (m.is_ucapan === "TRUE" || m.is_ucapan === true) && m.userId === userId);
    return !!head;
  } else {
    // Kalau filter TIDAK aktif, tetap cari thread dengan ucapan utama (tanpa cek userId)
    const head = messages.find(m => m.is_ucapan === "TRUE" || m.is_ucapan === true);
    return !!head;
  }
});

  daftar.innerHTML = "";
  daftar.classList.remove("show");
  void daftar.offsetWidth;
  daftar.classList.add("fade-in", "show");

  if (filteredThreads.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "ucapan-empty";
    emptyDiv.innerHTML = `
      <div class="empty-illustration">
        <img src="https://undangan-bdg.vercel.app/Asset/floating.png" alt="Belum ada ucapan" width="120" height="120">
      </div>
      <p>Belum ada ucapan masuk.<br><em>Yuk beri ucapan pertama! ✨</em></p>
    `;
    daftar.appendChild(emptyDiv);

  } else {
  if (filterAktif) {
    // === FILTER AKTIF MODE (WhatsApp bubble)
    filteredThreads.forEach(([threadId, messages]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "ucapan-thread";

      messages
 .sort((a, b) => new Date(a.timestamp || a.reply_timestamp) - new Date(b.timestamp || b.reply_timestamp))
 .forEach((msg, index) => {
   const isHead = msg.is_ucapan === "TRUE" || msg.is_ucapan === true;
   const isAdmin = msg.nama?.toLowerCase() === "admin";
   const bubbleClass = isHead ? "head-ucapan" : isAdmin ? "reply-admin" : "reply-user";

   const bubbleWrapper = document.createElement("div");
   bubbleWrapper.className = `bubble-wrapper ${bubbleClass}`;

   const bubble = document.createElement("div");
   bubble.className = "bubble";
   bubble.style.animation = "fadeIn 0.5s ease-out both";

   // ✨ Tambahin animasi ke semua bubble
   bubble.style.animation = "fadeInUp 0.5s ease-out forwards";
   bubble.style.animationDelay = `${index * 0.2}s`;

   bubble.innerHTML = `
     <div style="display:flex; align-items:center; gap:0.5em;">
       <strong>${msg.nama}</strong>
     </div>
     <div>${msg.ucapan}</div>
     <div class="ucapan-time">
       ${msg.timestamp ? formatWaktuIndo(msg.timestamp) : '<em>Waktu tidak diketahui</em>'}
     </div>
   `;

   bubbleWrapper.appendChild(bubble);
   wrapper.appendChild(bubbleWrapper);
 });

      // === Tambahkan form chat reply di akhir thread (hanya kalau filter aktif)
      if (filterCheckbox?.checked) {
        const replyForm = document.createElement("form");
        replyForm.className = "reply-form";

        replyForm.innerHTML = `
          <input type="text" placeholder="Ketik balasan..." class="reply-input" />
          <button type="submit" class="reply-button">➤</button>
        `;

        replyForm.onsubmit = (e) => {
          e.preventDefault();
          const input = replyForm.querySelector(".reply-input");
          const text = input.value.trim();
          if (!text) {
          showToast("Balasan tidak boleh kosong! ❌", "error");
          return false; // ❌ kosong => stop
           }
            kirimBalasanLanjutan(threadId, text, localStorage.getItem("nama") || "Anonim");
            input.value = ""; // ✅ setelah berhasil kirim, kosongkan input
        };

        wrapper.appendChild(replyForm);
      }

      daftar.appendChild(wrapper);
    });

    // Sembunyikan pagination saat filter aktif
    const pageInfo = document.getElementById("pageInfo");
    const paginationContainer = document.getElementById("paginationContainer");
    if (pageInfo) pageInfo.style.display = "none";
    if (paginationContainer) paginationContainer.style.display = "none";

  } else {
      // === FILTER TIDAK AKTIF MODE (List Card + Like)
      data
  .filter(msg => msg.is_ucapan === true || msg.is_ucapan === "TRUE")
  .sort((a, b) => {
  // Prioritaskan Winner
  const aWinner = a.isWinner === true || a.isWinner === "TRUE";
  const bWinner = b.isWinner === true || b.isWinner === "TRUE";

  if (aWinner && !bWinner) return -1;
  if (!aWinner && bWinner) return 1;

  // Kalau dua-duanya winner atau bukan winner, cek like count
  const likesA = Array.isArray(a.likes) ? a.likes.length : 0;
  const likesB = Array.isArray(b.likes) ? b.likes.length : 0;
  if (likesB !== likesA) return likesB - likesA;

  // Kalau like sama, cek timestamp
  return new Date(a.timestamp) - new Date(b.timestamp);
})
        .forEach(msg => {
          const card = document.createElement("div");
          card.className = "ucapan-card";
		  
		  if (msg.isWinner === true || msg.isWinner === "TRUE") {
    card.classList.add("winner-card"); // ✨ Tambahkan class khusus kalau dia pemenang
  }
		  
		  let badgeWinner = "";
if (msg.isWinner === true || msg.isWinner === "TRUE") {
  badgeWinner = `<img src="https://undangan-bdg.vercel.app/Asset/trophy.png" alt="Winner" class="badge-winner" style="width:16px;height:16px;margin-left:6px;">`;
}

          card.innerHTML = `
            <div style="padding:10px;">
              <strong>${msg.nama}</strong>${badgeWinner}<br>
              <div>${msg.ucapan}</div>
              <div style="margin-top:5px; font-size:0.8em; color:#777;">
                ${msg.timestamp ? formatWaktuIndo(msg.timestamp) : '<em>Waktu tidak diketahui</em>'}
              </div>
            </div>
          `;

          // LIKE/UNLIKE tombol di mode List
          const likeDiv = renderLikes(msg.id, msg.likes || []);
          card.appendChild(likeDiv);

          daftar.appendChild(card);
        });
    }
  }

  // Auto-scroll ke bawah setelah render
  setTimeout(() => {
  if (daftar) {
    daftar.scrollTop = 0;
  }
}, 300);

  // Vibration ringan setiap load
  if (typeof window.navigator.vibrate === "function") {
    window.navigator.vibrate(50);
  }

  // === Pagination Show/Hide
  const pageInfo = document.getElementById("pageInfo");
const paginationContainer = document.getElementById("paginationContainer");

if (filterAktif) {
  // Kalau filter aktif (mode WhatsApp Bubble), sembunyikan pagination
  if (pageInfo) pageInfo.style.display = "none";
  if (paginationContainer) paginationContainer.style.display = "none";

} else {
  // Kalau filter tidak aktif, hitung total ucapan utama (is_ucapan == true saja)
  const totalUcapanFiltered = data.filter(msg => msg.is_ucapan === true || msg.is_ucapan === "TRUE").length;
  const totalPages = Math.max(1, Math.ceil(totalUcapan / perPage));

  renderPagination(totalPages);

  if (pageInfo) {
    pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    pageInfo.style.display = "block";
  }
  if (paginationContainer) {
    paginationContainer.style.display = "flex";
  }
}

}













// === KIRIM BALASAN LANJUTAN ===
function kirimBalasanLanjutan(threadId, ucapan, nama) {
  //if (!ucapan.trim()) return alert("Balasan tidak boleh kosong!");
  if (!ucapan.trim()) {
    showToast("Balasan tidak boleh kosong! ❌", "error");
    return false; // ✨ Biar stop sempurna
  }

  const form = new URLSearchParams();
  form.append("userId", getUserId());
  form.append("nama", localStorage.getItem("nama") || nama);
  form.append("ucapan", ucapan);
  form.append("is_ucapan", "false");
  form.append("thread", threadId);

  fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  })
  .then(() => {
    //alert("Balasan terkirim!");
	showToast("Balasan berhasil terkirim! 🎉", "success");
    ambilUcapan();
  })
  .catch(err => {
    console.error("Gagal kirim balasan:", err);
    //alert("Gagal kirim balasan.");
	showToast("Gagal kirim balasan. Coba lagi! ❌", "error")
  });
}

function renderLikes(ucapanId, likeList) {
  // Kalau bukan array, coba parse, kalau gagal jadikan array kosong
  if (!Array.isArray(likeList)) {
    try {
      likeList = JSON.parse(likeList);
      if (!Array.isArray(likeList)) likeList = [];
    } catch {
      likeList = [];
    }
  }

  const likeContainer = document.createElement("div");
  likeContainer.className = "like-container";

  const likedByUser = likeList.some(like => like.userId === getUserId());
  const likeCount = likeList.length;

  likeContainer.innerHTML = `
    <div class="like-wrapper">
      <button class="like-btn ${likedByUser ? 'liked' : ''}" data-id="${ucapanId}">
        <img src="https://undangan-bdg.vercel.app/Asset/love.png" alt="Like" class="like-icon">
        <span class="like-count">${likeCount}</span>
      </button>
      <div class="like-tooltip">
        ${likeList.map(l => `<img src="https://undangan-bdg.vercel.app/Asset/rating.png" alt="User" class="user-icon"> ${l.nama}`).join('<br>')}
      </div>
    </div>
  `;

  // ✅ Ambil tombol like-nya
  const likeBtn = likeContainer.querySelector(".like-btn");
  likeBtn.onclick = (e) => {
    e.stopPropagation(); // ⛔ Supaya tidak trigger klik bubble
    toggleLike(ucapanId, likedByUser);
  };

  return likeContainer;
}




function toggleLike(ucapanId, alreadyLiked) {
  const form = new URLSearchParams();
  form.append("action", alreadyLiked ? "unlike" : "like");
  form.append("id_ucapan", ucapanId);
  form.append("userId", getUserId());
  form.append("nama", localStorage.getItem("nama") || "Anonim");

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  })
  .then(res => res.text())
  .then(res => {
    if (res === "OK") ambilUcapan();
    else console.warn("Respon server:", res);
  })
  .catch(err => {
    console.error("Gagal like/unlike:", err);
  });
}


// === PAGINATION ===
function renderPagination(totalPages) {
  const paginationDiv = document.getElementById("pagination") || document.createElement("div");
  paginationDiv.id = "pagination";
  paginationDiv.innerHTML = "";

  const pageInfo = document.getElementById("pageInfo");

  // 🚀 Patch supaya minimal 1 halaman
  const fixedTotalPages = Math.max(totalPages, 1);
  if (pageInfo) pageInfo.textContent = `Halaman ${currentPage} dari ${fixedTotalPages}`;

  const createBtn = (label, disabled = false, onClick = null) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.disabled = disabled;
    if (onClick) {
    btn.onclick = (e) => {
      btn.classList.remove("page-clicked"); // reset dulu biar animasi bisa ulang
      void btn.offsetWidth; // trigger reflow
      btn.classList.add("page-clicked"); // kasih animasi klik
      setTimeout(() => { // kasih delay dikit baru jalankan action
        onClick(e);
      }, 200); // biar user lihat animasi dulu
    };
  }
  return btn;
};

  paginationDiv.appendChild(createBtn("←", currentPage === 1, () => {
    currentPage--;
    ambilUcapan();
  }));

  const pages = [];
  if (fixedTotalPages <= 5) {
    for (let i = 1; i <= fixedTotalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, "...", fixedTotalPages);
    } else if (currentPage >= fixedTotalPages - 2) {
      pages.push(1, "...", fixedTotalPages - 2, fixedTotalPages - 1, fixedTotalPages);
    } else {
      pages.push(1, "...", currentPage, "...", fixedTotalPages);
    }
  }

  pages.forEach(p => {
    if (p === "...") {
      const span = document.createElement("span");
      span.textContent = "...";
      span.className = "ellipsis";
      paginationDiv.appendChild(span);
    } else {
      const btn = createBtn(p, p === currentPage, () => {
        currentPage = Number(p);
        ambilUcapan();
      });
      paginationDiv.appendChild(btn);
    }
  });

  paginationDiv.appendChild(createBtn("→", currentPage === fixedTotalPages, () => {
    currentPage++;
    ambilUcapan();
  }));

  const daftar = document.getElementById("daftarUcapan");
  const existingPagination = document.getElementById("pagination");
  if (existingPagination) existingPagination.remove();
  daftar.appendChild(paginationDiv);
}





function animateLetterDropById(id) {
  const h1 = document.getElementById(id);
  if (!h1) return;

  const text = h1.textContent.trim();
  h1.innerHTML = "";
  [...text].forEach((char, i) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.style.display = "inline-block";
    span.style.transform = "translateY(-50px)";
    span.style.opacity = "0";
    span.style.transition = `transform 0.5s ease-out, opacity 0.5s ease-out`;
    span.style.transitionDelay = `${i * 70 + 300}ms`;
    h1.appendChild(span);
  });

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      h1.querySelectorAll("span").forEach(span => {
        span.style.transform = "translateY(0)";
        span.style.opacity = "1";
      });
      observer.unobserve(h1);
    }
  }, { threshold: 0.4 });

  observer.observe(h1);
}

// === Animate Slider on Scroll into View ===
function animateSliderOnView() {
  const sliders = document.querySelectorAll('.slider');

  sliders.forEach(slider => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          slider.value = 0;
          let progress = 0;
          const animate = setInterval(() => {
            progress += 1; // 🔥 diperlambat: tambah 1 saja tiap cycle
            slider.value = progress;
            const wrapper = slider.previousElementSibling;
            if (wrapper) wrapper.style.width = progress + "%";
            if (progress >= 100) {
              clearInterval(animate);
              setTimeout(() => {
                slider.value = 50;
                if (wrapper) wrapper.style.width = "50%";
              }, 500); // lebih lambat juga delay reset
            }
          }, 30); // 🔥 diperlambat: dari 20ms jadi 30ms
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    observer.observe(slider);
  });
}


// ✨ Zoom Foto Belakang saat in-view
function animateZoomFoto() {
  const fotos = document.querySelectorAll('.zoomable');

  fotos.forEach(foto => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          foto.classList.add('in-view');
          observer.unobserve(foto);
        }
      });
    }, { threshold: 0.4 });

    observer.observe(foto);
  });
}



function playBGM() {
  if (!bgm || typeof bgm.play !== "function") return;
  bgm.volume = 0;

  bgm.play().then(() => {
    let vol = 0;
    const fadeIn = setInterval(() => {
      if (vol < 0.2) {
        vol += 0.02;
        bgm.volume = Math.min(vol, 0.2);
      } else {
        clearInterval(fadeIn);
      }
    }, 200);
  }).catch(err => console.warn("Autoplay gagal:", err));
}





// === INISIALISASI FINAL PATCH ===
document.addEventListener("DOMContentLoaded", () => {
  animateSliderOnView();
  animateZoomFoto();
  loadVoiceNotes();     
  
  
  

  

  

const btnKirimUcapan = document.getElementById('btnKirimUcapan');
const realSubmitButton = document.getElementById('realSubmitButton');
const userIdValue = document.getElementById("userIdValue");
const namaInput = document.getElementById("nama");
const splash = document.getElementById("splash");
const mainContent = document.getElementById("mainContent");


  // ✅ Tombol Icon Kirim Ucapan
  if (btnKirimUcapan && realSubmitButton) {
    btnKirimUcapan.addEventListener('click', () => {
      realSubmitButton.click(); // 🚀 Trigger form ucapan biasa
    });
  }

 



  // ✅ Setup User Info
  const userId = getUserId();
  const display = document.getElementById("userIdValue");
  const namaUser = localStorage.getItem("nama");
  if (display) {
    display.innerHTML = namaUser
      ? `Hi, <strong>${namaUser}</strong> 👋`
      : `Hi, <small>${userId}</small>`;
  }

  // ✅ Prefill Nama
  const namaPrefill = localStorage.getItem("nama");
  if (namaPrefill && document.getElementById("nama")) {
    document.getElementById("nama").value = namaPrefill;
  }

  // ✅ Cek status Reservasi & Ucapan
  if (localStorage.getItem("sudahReservasi") === "true") {
    tampilkanReservasiSudahSubmit();
  }
  if (localStorage.getItem("sudahSubmitUcapan") === "true") {
    tampilkanUcapanSudahSubmit();
  }

  // ✅ Splashscreen dan MainContent
  if (splash) splash.style.display = "flex";
  if (mainContent) mainContent.style.display = "none";

  // ✅ Filter Ucapan
  const filter = document.getElementById("filterByUser");
  if (filter) {
    filter.addEventListener("change", () => {
      currentPage = 1;
      ambilUcapan();
    });
  }

  // ✅ Countdown Mulai
  startCountdown();

  // ✅ Load Ucapan
  setTimeout(() => {
    ambilUcapan();
  }, 300);

  // ✅ Setup Parallax
  const parallaxElements = document.querySelectorAll('.parallax-bg');
  if (parallaxElements.length > 0) {
    new Rellax('.parallax-bg', {
      speed: window.innerWidth > 768 ? -4 : -2,
      center: true,
      round: true,
      vertical: true,
      horizontal: false
    });
  }

  // ✅ Scroll Reveal
  const scrollElements = document.querySelectorAll(".scroll-reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  scrollElements.forEach((el) => observer.observe(el));

  // ✅ Pantun Random
  const pantunList = [
    `Mentari pagi bersinar cerah,<br>Membawa hangat di tiap langkah.<br>Mari bersama berbagi suka,<br>Di hari bahagia kami berdua.`,
    `Angin berbisik di antara dedaunan,<br>Membawa kisah tentang kebahagiaan.<br>Hadirlah, teman dan saudara,<br>Menyemai doa di hari istimewa.`,
    `Burung terbang mengepakkan sayap,<br>Membawa harapan tanpa lelah.<br>Mari kita kumpul penuh canda,<br>Mengukir memori sepanjang masa.`,
    `Langit jingga di pagi cerah,<br>Menyapa kasih dengan ramah.<br>Ayo bergabung di pesta cinta,<br>Bersama doa dan tawa bahagia.`,
    `Daun gugur menari di angin,<br>Membisikkan cerita tentang cinta.<br>Datanglah kawan, mari bersanding,<br>Membawa doa penuh makna.`
  ];
  const pantunContainer = document.getElementById("pantunContainer");
  if (pantunContainer) {
    const randomPantun = pantunList[Math.floor(Math.random() * pantunList.length)];
    pantunContainer.innerHTML = randomPantun;
  }
  animateWords(".pantun-container");
  animateWords(".penutup-invite");

  // ✅ Bell Notification Scroll
  const bell = document.getElementById("notificationBell");
  if (bell) {
    bell.addEventListener("click", () => {
      const daftar = document.getElementById("daftarUcapan");
      if (daftar) {
        daftar.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // ✅ Mulai Polling Cek Ucapan
  setTimeout(() => {
    startPollingUcapan();
  }, 3000);

});



// === FUNGSI POLLING UCAPAN ===
async function startPollingUcapan() {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      const url = new URL(endpoint);
      const filterCheckbox = document.getElementById("filterByUser");
      const filterAktif = filterCheckbox?.checked;

      if (!filterAktif) {
        // Mode lihat semua ucapan
        url.searchParams.set("limit", "1");
        url.searchParams.set("page", "1");
        url.searchParams.set("actionType", "filterUnchecked");
      } else {
        // Mode chat personal ➔ lihat semua thread
        url.searchParams.set("actionType", "filterChecked");
      }

      const res = await fetch(url.toString());
      const result = await res.json();
      const semuaData = Array.isArray(result) ? result : result.data || [];

      if (!filterAktif) {
        // Mode lihat semua ucapan
        const totalSekarang = result.total || 0;

        if (totalSekarang !== lastTotalUcapan) {
          console.log("🚀 Ada perubahan ucapan di umum!");
          lastTotalUcapan = totalSekarang;
          ambilUcapan();
          playNotificationSound();
        }
      } else {
        // Mode chat ➔ cek thread saya
        if (semuaData.length !== lastTotalUcapan) {
          console.log("🚀 Ada update balasan chat baru!");
          lastTotalUcapan = semuaData.length;
          ambilUcapan();
          playNotificationSound();
        }
      }
      
      // Bell animasi
      const bell = document.getElementById("notificationBell");
      if (bell) {
        bell.style.display = "block";
        bell.classList.remove("shake");
        void bell.offsetWidth;
        bell.classList.add("shake");

        setTimeout(() => {
          bell.style.display = "none";
        }, 4000);
      }

    } catch (err) {
      console.warn("Polling error:", err);
    }
  }, 10000); // polling 10 detik
}




async function fetchAndAppendNewUcapan() {
  try {
    const url = new URL(endpoint);
    url.searchParams.set("limit", "1");
    url.searchParams.set("page", "1");
    url.searchParams.set("actionType", "filterUnchecked");

    const res = await fetch(url.toString());
    const result = await res.json();
    const newUcapan = Array.isArray(result) ? result[0] : (result.data ? result.data[0] : null);

    if (newUcapan) {
      const daftar = document.getElementById("daftarUcapan");
      const card = createUcapanCard(newUcapan);
      daftar.appendChild(card);
    }
  } catch (err) {
    console.error("Gagal fetch ucapan baru:", err);
  }
}

// 🔥 Helper buat create 1 card ucapan
function createUcapanCard(data) {
  const div = document.createElement("div");
  div.className = "ucapan-card"; // masih ucapan-card biasa dulu
  div.innerHTML = `
    <strong>${data.nama || 'Anonim'}</strong>
    <p>${data.ucapan || ''}</p>
    <small>${formatWaktuIndo(data.timestamp)}</small>
    <div class="likes">❤️ ${Array.isArray(data.likes) ? data.likes.length : 0}</div>
  `;

  // Setelah element sudah ada di DOM ➔ kasih class .show
  setTimeout(() => {
    div.classList.add("show");
  }, 50); // kasih sedikit delay supaya animasi jalan

  return div;
}





function animateWords(selector) {
  const container = document.querySelector(selector);
  if (!container) return;
  const html = container.innerHTML.trim();
  container.innerHTML = "";

  const parts = html.split(/(\s+|<br\s*\/?>)/gi);

  let delayIndex = 0;

  parts.forEach((part) => {
    if (/<br\s*\/?>/i.test(part)) { // 🔥 pakai regex test yang aman
      container.appendChild(document.createElement("br"));
    } else if (part.trim() !== "") {
      const span = document.createElement("span");
      span.innerHTML = part + " "; // Tetap pakai innerHTML
      span.style.opacity = 0;
      span.style.display = "inline-block";
      span.style.transform = "translateY(20px)";
      span.style.animation = "fadeSlideUpSlow 1.5s ease-out forwards";
      span.style.animationDelay = `${delayIndex * 0.25}s`;
      container.appendChild(span);
      delayIndex++;
    }
  });
}






function showToast(message, tipe = "success") {
  let toast = document.getElementById('toastNotification');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<div class="toast-message">${message}</div>`;

  const progress = document.createElement('div');
  progress.className = 'toast-progress';
  if (tipe === "error") {
    toast.style.background = "rgba(220, 53, 69, 0.95)";
    progress.style.background = "#ff4444"; // Merah untuk error
    playErrorSound();
  } else {
    toast.style.background = "rgba(50, 50, 50, 0.9)";
    progress.style.background = "#4caf50"; // Hijau untuk sukses
    playPopSound();
  }

  toast.appendChild(progress);

  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast); // hapus dari DOM setelah animasi
      }
    }, 400); // biar smooth
  }, 2500);
}



function playErrorSound() {
  const popSound = new Audio('https://undangan-bdg.vercel.app/Asset/fail-sound.mp3');
  popSound.volume = 0.5;
  popSound.play().catch(err => console.warn("Error sound gagal:", err));
}

function playNotificationSound() {
  const popSound = new Audio('https://undangan-bdg.vercel.app/Asset/bell-notification.mp3');
  popSound.volume = 0.5;
  popSound.play().catch(err => console.warn("Notification sound gagal:", err));
}

function playPopSound() {
  const popSound = new Audio('https://undangan-bdg.vercel.app/Asset/pop-up-sound.mp3');
  popSound.volume = 0.5;
  popSound.play().catch(err => console.warn("Pop sound gagal:", err));
}

const bottomSheetConfigs = {
  bottomSheet: 60,       // ID "bottomSheet" (RSVP) swipe threshold
  bottomSheetDoa: 50,    // ID "bottomSheetDoa" (Ucapan & Doa) swipe threshold
  bottomSheetScratch: 40,// ID "bottomSheetScratch" (Scratch & Win)
  bottomSheetReservasi: 50, // ✅ Tambahkan reservasi
  bottomSheetVoiceSent: 50  // ✅ Tambahkan voice already sent
};

function openBottomSheetGeneric(sheetId) {
  const sheet = document.getElementById(sheetId);
  if (!sheet) return;

  sheet.classList.remove("hidden");
  setTimeout(() => {
    sheet.classList.add("active");
    vibrateShort();
	
	const quickMenu = document.getElementById("quickAccessMenu");
    if (quickMenu) quickMenu.classList.add("hide");
	
  }, 10);

  const content = sheet.querySelector('.bottom-sheet-content');
  let startY = 0;
  let isSwiping = false;

  if (content) {
    // 🔥 Clean event listener
    const newContent = content.cloneNode(true);
    content.parentNode.replaceChild(newContent, content);

    newContent.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      isSwiping = true;
    });

    newContent.addEventListener('touchmove', e => {
      if (!isSwiping) return;
      const currentY = e.touches[0].clientY;
      const swipeThreshold = bottomSheetConfigs[sheetId] || 60;

      if (currentY - startY > swipeThreshold) {
        // ❗ Protection khusus untuk Scratch
        if (sheetId === 'bottomSheetScratch' && typeof scratchFinished !== "undefined" && !scratchFinished) {
          showToast("Selesaikan scratch dulu ya sebelum menutup! 🎯", "error");
          isSwiping = false;
          return;
        }
        closeBottomSheetGeneric(sheetId);
        isSwiping = false;
      }
    });

    newContent.addEventListener('touchend', () => {
      isSwiping = false;
    });
  }
}

function closeBottomSheetGeneric(sheetId) {
  if (sheetId === 'bottomSheetScratch' && typeof scratchFinished !== "undefined" && !scratchFinished) {
    showToast("Selesaikan scratch dulu ya sebelum menutup! 🎯", "error");
    return;
  }

  const sheet = document.getElementById(sheetId);
  if (sheet) {
    sheet.classList.remove('active');
    setTimeout(() => {
      sheet.classList.add('hidden');
	  const quickMenu = document.getElementById("quickAccessMenu");
      if (quickMenu) quickMenu.classList.remove("hide");
    }, 300);
  }
}

// ✨ Vibration Short
function vibrateShort() {
  if (document.hasFocus() && navigator.vibrate) {
    navigator.vibrate(50);
  }
}





function tampilkanReservasiSudahSubmit() {
  const formReservasi = document.getElementById("formReservasi");
  const reservasiThanks = document.getElementById("reservasiThanks");

  if (formReservasi) {
    formReservasi.style.display = "none";
  }

  if (reservasiThanks) {
    reservasiThanks.style.display = "block";
  }
}

function tampilkanUcapanSudahSubmit() {
  const formUcapan = document.getElementById("formUcapan");
  const ucapanThanks = document.getElementById("ucapanThanks");
  const ucapanStatus = document.getElementById("ucapanStatusMsg");

  if (formUcapan) {
    formUcapan.style.display = "none";
    formUcapan.style.visibility = "hidden";
    formUcapan.style.height = "0";
    formUcapan.style.overflow = "hidden";
  }

  if (ucapanThanks) {
    ucapanThanks.style.display = "block";
  }

  if (ucapanStatus) {
    ucapanStatus.style.display = "none";
  }
}





// === GALERI FOTO INTERAKTIF DELUXE ===
const track = document.getElementById('carouselTrack');
let isDown = false;
let startX;
let scrollLeft;
let velocity = 0;
let momentumID = null;
let isUploading = false;

// === Handle Drag Mouse
track?.addEventListener('mousedown', (e) => {
  isDown = true;
  track.classList.add('active');
  startX = e.pageX - track.offsetLeft;
  scrollLeft = track.scrollLeft;
  velocity = 0;
  cancelMomentumTracking();
});

track?.addEventListener('mouseleave', () => {
  isDown = false;
  track.classList.remove('active');
  startMomentum();
});

track?.addEventListener('mouseup', () => {
  isDown = false;
  track.classList.remove('active');
  startMomentum();
});

track?.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - track.offsetLeft;
  const walk = (x - startX) * 1.5;
  velocity = walk - (track.scrollLeft - scrollLeft);
  track.scrollLeft = scrollLeft - walk;
});

// === Tambahan Support Scroll Mouse (Wheel)
track?.addEventListener('wheel', (e) => {
  track.scrollLeft += e.deltaY * 1.2;
}, { passive: true });

// === Momentum Scroll After Drag Release
function startMomentum() {
  cancelMomentumTracking();
  momentumID = requestAnimationFrame(momentumLoop);
}

function cancelMomentumTracking() {
  if (momentumID) {
    cancelAnimationFrame(momentumID);
    momentumID = null;
  }
}

function momentumLoop() {
  track.scrollLeft -= velocity;
  velocity *= 0.95; // Deceleration

  if (Math.abs(velocity) > 0.5) {
    momentumID = requestAnimationFrame(momentumLoop);
  } else {
    cancelMomentumTracking();
  }
}

// === Handle Slider Range Input kalau ada
document.querySelectorAll(".slider").forEach(slider => {
  const wrapper = slider.previousElementSibling;
  slider.addEventListener("input", function () {
    wrapper.style.width = this.value + "%";
  });
});







// ==== FORMAT TIMER ====
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}


// ==== BOTTOM SHEET CONTROL ====
function openVoiceSheet() {
  sheetVoice.classList.remove('hidden');
  setTimeout(() => sheetVoice.classList.add('active'), 10);
}

function closeVoiceSheet() {
  sheetVoice.classList.remove('active');
  setTimeout(() => sheetVoice.classList.add('hidden'), 300);
  timerDisplay.textContent = "00:00";
  clearInterval(recordTimer);
  resetRecording();
}

function resetRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  mediaRecorder = null;
  audioChunks = [];
  audioBlob = null;
  isPaused = false;
  elapsedSeconds = 0;
  replayAudio.src = "";
}

function forceStopRecording(message = "") {
  if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
    mediaRecorder.stop(); // ✅ STOP, bukan pause
  }
  if (recordTimer) {
    clearInterval(recordTimer);
    recordTimer = null;
  }
  if (pauseBtn) {
    pauseBtn.innerHTML = "▶️";
    pauseBtn.disabled = true;
  }
  if (replayBtn) replayBtn.disabled = false;
  if (sendBtn) sendBtn.disabled = false;

  if (message) {
    showToast(message, "warning");
  }
}

function forcePauseRecording(message = "") {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
  }
  if (recordTimer !== null) { // pastikan timer masih aktif
    clearInterval(recordTimer);
    recordTimer = null;
  }
  pauseBtn.innerHTML = "▶️";
  pauseBtn.disabled = true;
  replayBtn.disabled = false;
  sendBtn.disabled = false;

  if (message) {
    showToast(message, "warning");
  }
}




// ==== RECORDING ====
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", event => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", () => {
      audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      sendBtn.disabled = false;
      replayBtn.disabled = false;
      stopWaveAnimation(); // ✅ Panggil ini di onStop
    });

    mediaRecorder.start();
    openVoiceSheet();
    startWaveAnimation(stream); // ✅ Panggil ini di startRecording, pakai stream dari getUserMedia

    elapsedSeconds = 0;
    timerDisplay.innerText = formatTime(elapsedSeconds);

    recordTimer = setInterval(() => {
      if (!mediaRecorder || mediaRecorder.state !== "recording") {
        clearInterval(recordTimer);
        recordTimer = null;
        return;
      }
      elapsedSeconds++;
      timerDisplay.innerText = formatTime(elapsedSeconds);

      if (elapsedSeconds >= 30) {
        forceStopRecording("⏳ Maksimal 30 detik tercapai. Rekaman disimpan.");
        return;
      }
    }, 1000);

  } catch (err) {
    console.error("Microphone error:", err);
    showToast("❗ Mikrofon error atau akses ditolak.", "error");
  }
}




function stopRecording() {
  if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
    mediaRecorder.stop();
  }
  clearInterval(recordTimer);
}

// ==== WAVEFORM ====
function initWaveform() {
  canvas = document.getElementById('voiceWave');
  if (!canvas) return;
  canvas.width = canvas.offsetWidth;
  canvas.height = 80;
  canvasCtx = canvas.getContext('2d');
}

function startWaveAnimation(stream) {
  canvas = document.getElementById('voiceWave');
  if (!canvas) return;
  canvasCtx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 80;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioContext.createMediaStreamSource(stream);
  analyserNode = audioContext.createAnalyser();

  sourceNode.connect(analyserNode);
  analyserNode.fftSize = 2048;

  dataArray = new Uint8Array(analyserNode.fftSize);
  drawWaveform();
}

function drawWaveform() {
  animationFrameId = requestAnimationFrame(drawWaveform);
  analyserNode.getByteTimeDomainData(dataArray);

  canvasCtx.fillStyle = "#fff";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "#4CAF50";
  canvasCtx.beginPath();

  const sliceWidth = canvas.width * 1.0 / dataArray.length;
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * canvas.height / 2;
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}

function stopWaveAnimation() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (audioContext) audioContext.close();
}

function startWaveAnimationFromAudioElement(audioElement) {
  canvas = document.getElementById('voiceWave');
  if (!canvas) return;
  canvasCtx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = 80;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sourceNode = audioContext.createMediaElementSource(audioElement);
  analyserNode = audioContext.createAnalyser();

  sourceNode.connect(analyserNode);
  analyserNode.connect(audioContext.destination); // supaya suara tetap kedengeran

  analyserNode.fftSize = 2048;
  dataArray = new Uint8Array(analyserNode.fftSize);

  drawWaveform();
}


// ==== UPLOAD VOICE ====
async function uploadVoiceToVercel() {
  if (!audioBlob) {
    showToast("❗ Tidak ada rekaman suara untuk dikirim.", "error");
    return;
  }

  const token = "vercel_blob_rw_RrG4Xm4BXI0KUISA_4FSRlslldCKCWZXg5hEI1oA3Hjw0Eg"; // 🔥 GANTI token Storage
  const filename = `voice-note/voice-${Date.now()}.webm`; // Sesuai folder & format
  const putUrl = `https://blob.vercel-storage.com/${filename}`;
  const publicUrl = `https://rrg4xm4bxi0kuisa.public.blob.vercel-storage.com/${filename}`;

  try {
    showUploadProgress();
    sendBtn.disabled = true;

    console.log("✅ Mulai upload ke:", putUrl);

    const res = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": audioBlob.type,
        "x-content-type": audioBlob.type,
        "x-content-length": audioBlob.size.toString()
      },
      body: audioBlob
    });
	
	const data = await res.json();

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload gagal ke Vercel Blob");
    }
	
	const publicUrl = data.url;

    console.log("✅ Upload sukses:", publicUrl);

    // === Save public URL ke Sheets
    const saveRes = await fetch(endpoint, {
      method: "POST",
      body: new URLSearchParams({
        action: "uploadVoice",
        userId: getUserId(),
        url: publicUrl,
      }),
    });

    const saveResult = await saveRes.json();
    if (!saveResult.success) {
      throw new Error("❌ Gagal menyimpan URL ke Sheets.");
    }

    console.log("✅ URL voice berhasil disimpan ke Sheets");
    showToast("✅ Voice berhasil dikirim dan dicatat!", "success");

    closeVoiceSheet();
    await loadVoiceNotes();

  } catch (err) {
    console.error("❌ Upload error:", err);
    showToast("❌ Upload error: " + err.message, "error");
  } finally {
    hideUploadProgress();
    sendBtn.disabled = false;
  }
}












function uploadToVercelWithProgress(formData, filename) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${endpointvoice}/api/upload-to-blob?filename=${filename}`, true);

    xhr.upload.onprogress = function(event) {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        const bar = document.querySelector('#uploadProgress .upload-bar');
        if (bar) {
          bar.style.width = percent + "%"; // ✅ Real Progress
        }
      }
    };

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          if (json.url) {
            resolve(json.url);
          } else {
            reject(new Error('Upload sukses tapi tidak dapat URL.'));
          }
        } catch (e) {
          reject(new Error('Gagal parsing response .JSON.'));
        }
      } else {
        reject(new Error('Upload ke Blob gagal. Status: ' + xhr.status));
      }
    };

    xhr.onerror = function() {
      reject(new Error('Error saat upload.'));
    };

    xhr.send(formData);
  });
}


// ==== LOAD APPROVED VOICES ====
async function loadVoiceNotes() {
  const container = document.getElementById('voiceList');
  if (!container) return;

  container.innerHTML = "Loading...";

  try {
    const res = await fetch(endpoint + '?action=listVoice');
    const data = await res.json();
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = `
        <div class="empty-voice">
          <img src="https://undangan-bdg.vercel.app/Asset/no-voice.png" alt="No Voice" style="max-width: 200px; margin: 0 auto; display: block;">
          <p style="text-align: center; color: #666; margin-top: 1em;">Belum ada voice note tersedia. Yuk kirim suaramu! 🎤</p>
        </div>
      `;return;
    }

    let currentAudio = null;
    let currentInterval = null;

    data.forEach(({ url, nama, userId }) => {
      const audioUrl = url.includes('/file/d/')
        ? `https://drive.google.com/uc?export=download&id=${url.split('/d/')[1].split('/')[0]}`
        : url;

      const card = document.createElement('div');
      card.className = "voice-card";

      card.innerHTML = `
        <div class="voice-header">${nama || userId}</div>
        <div class="voice-body">
          <button class="play-pause-btn">▶️</button>
          <div class="voice-progress">
            <div class="voice-progress-bar"></div>
          </div>
          <div class="voice-duration">0:00</div>
        </div>
      `;

      const audio = new Audio(audioUrl);
      const playBtn = card.querySelector('.play-pause-btn');
      const progressBar = card.querySelector('.voice-progress-bar');
      const durationText = card.querySelector('.voice-duration');

      playBtn.addEventListener('click', () => {
        if (currentAudio && currentAudio !== audio) {
          currentAudio.pause();
          if (currentAudio.button) currentAudio.button.textContent = '▶️';
          clearInterval(currentInterval);
        }

        if (audio.paused) {
          audio.play();
          playBtn.textContent = '⏸️';
          currentAudio = audio;
          currentAudio.button = playBtn;
          currentInterval = setInterval(() => {
            const percent = (audio.currentTime / (audio.duration || 1)) * 100;
            progressBar.style.width = percent + '%';
            durationText.textContent = formatTime(audio.currentTime);
          }, 200);
        } else {
          audio.pause();
          playBtn.textContent = '▶️';
          clearInterval(currentInterval);
        }
      });

      audio.addEventListener('ended', () => {
        playBtn.textContent = '▶️';
        clearInterval(currentInterval);
        progressBar.style.width = '0%';
        durationText.textContent = '0:00';
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading voice notes:", err);
    container.innerHTML = "Gagal memuat suara.";
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}


// ==== BUTTON EVENT BINDING ====
startBtn.addEventListener('mousedown', () => {
  if (recordingAllowed && (!mediaRecorder || mediaRecorder.state === "inactive")) {
    startRecording();
  }
});

startBtn.addEventListener('touchstart', () => {
  if (recordingAllowed && (!mediaRecorder || mediaRecorder.state === "inactive")) {
    startRecording();
  }
}, { passive: true });

startBtn.addEventListener('mouseup', () => {
  if (recordingAllowed) {
    forceStopRecording("Rekaman berhenti setelah 30 detik");
  }
});

startBtn.addEventListener('touchend', () => {
  if (recordingAllowed) {
    forceStopRecording("Rekaman berhenti setelah 30 detik");
  }
});

cancelBtn.addEventListener('click', () => {
  recordingAllowed = false; // ✅ Reset flag
  closeVoiceSheet();
  forceStopRecording();
});

pauseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  showToast("⏸️ Fitur pause tidak tersedia. Rekaman otomatis dipause saat lepas atau 30 detik.", "warning");
});


replayBtn.addEventListener('click', () => {
  if (audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    replayAudio.src = audioUrl;
    replayAudio.style.display = "block";
    replayAudio.play();

    startWaveAnimationFromAudioElement(replayAudio);

    replayAudio.onended = () => {
      stopWaveAnimation();
    };
  }
});


sendBtn.addEventListener('click', async () => {
  if (!audioBlob) {
    showToast('❗ Belum ada suara untuk dikirim.', "error");
    return;
  }
  showUploadProgress();
  await uploadVoiceToVercel();
  hideUploadProgress();
});

// ==== UPLOAD PROGRESS ====
function showUploadProgress() {
  const progress = document.getElementById('uploadProgress');
  const bar = document.querySelector('#uploadProgress .upload-bar');
  if (progress && bar) {
    progress.classList.add('show');
    bar.style.width = '0%'; // Mulai dari nol
  }
}

function hideUploadProgress() {
  const progress = document.getElementById('uploadProgress');
  const bar = document.querySelector('#uploadProgress .upload-bar');
  if (progress && bar) {
    progress.classList.remove('show');
    bar.style.width = '0%'; // Reset
  }
}




const voiceButton = document.getElementById('startVoiceButton');

let isDragging = false;
let offsetX, offsetY;

voiceButton.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.clientX - voiceButton.getBoundingClientRect().left;
  offsetY = e.clientY - voiceButton.getBoundingClientRect().top;
  voiceButton.style.transition = "none"; // supaya smooth pas drag
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    voiceButton.style.left = `${x}px`;
    voiceButton.style.top = `${y}px`;
    voiceButton.style.position = 'fixed'; // penting! jadi dia bebas
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  voiceButton.style.transition = "all 0.2s ease"; // balikin transition smooth
});

// ✅ Tambahan untuk support touchscreen mobile
voiceButton.addEventListener('touchstart', (e) => {
  isDragging = true;
  const touch = e.touches[0];
  offsetX = touch.clientX - voiceButton.getBoundingClientRect().left;
  offsetY = touch.clientY - voiceButton.getBoundingClientRect().top;
  voiceButton.style.transition = "none";
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (isDragging) {
    const touch = e.touches[0];
    const x = touch.clientX - offsetX;
    const y = touch.clientY - offsetY;
    voiceButton.style.left = `${x}px`;
    voiceButton.style.top = `${y}px`;
    voiceButton.style.position = 'fixed';
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  isDragging = false;
  voiceButton.style.transition = "all 0.2s ease";
});



document.getElementById('startVoiceButton').addEventListener('click', cekSyaratSebelumRekam);

async function cekSyaratSebelumRekam() {
  const userId = getUserId();
  if (!userId) {
    console.warn("User ID tidak ditemukan.");
    return;
  }

  try {
    // 🔥 Tambahkan ?_=${Date.now()} untuk bust cache
    const res = await fetch(`${endpoint}?action=checkVoiceEligibility&userId=${userId}&_=${Date.now()}`);
    const result = await res.json();

    if (!result.reserved) {
      recordingAllowed = false;
      closeVoiceSheet();
      forceStopRecording();
      openBottomSheetGeneric('bottomSheetReservasi');
      return;
    }

    if (result.hasVoice) {
      recordingAllowed = false;
      closeVoiceSheet();
      forceStopRecording();
      openBottomSheetGeneric('bottomSheetVoiceSent');
      return;
    }

    recordingAllowed = true;
    openVoiceSheet();
	startRecording();

  } catch (err) {
    console.error("Gagal cek eligibility:", err);
  }
}

//---start
// === MUSIC TOGGLE BUTTON ===
const musicButton = document.getElementById('toggleMusicButton');
const musicIcon = document.getElementById('musicIcon');

let isDraggingMusic = false;
let offsetMusicX = 0, offsetMusicY = 0;

musicButton.addEventListener('mousedown', (e) => {
  isDraggingMusic = true;
  offsetMusicX = e.clientX - musicButton.getBoundingClientRect().left;
  offsetMusicY = e.clientY - musicButton.getBoundingClientRect().top;
  musicButton.style.transition = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (isDraggingMusic) {
    const x = e.clientX - offsetMusicX;
    const y = e.clientY - offsetMusicY;
    musicButton.style.left = `${x}px`;
    musicButton.style.top = `${y}px`;
    musicButton.style.position = 'fixed';
  }
});

document.addEventListener('mouseup', () => {
  isDraggingMusic = false;
  musicButton.style.transition = 'all 0.2s ease';
});

// === Touch support
musicButton.addEventListener('touchstart', (e) => {
  isDraggingMusic = true;
  const touch = e.touches[0];
  offsetMusicX = touch.clientX - musicButton.getBoundingClientRect().left;
  offsetMusicY = touch.clientY - musicButton.getBoundingClientRect().top;
  musicButton.style.transition = 'none';
});

document.addEventListener('touchmove', (e) => {
  if (isDraggingMusic) {
    const touch = e.touches[0];
    const x = touch.clientX - offsetMusicX;
    const y = touch.clientY - offsetMusicY;
    musicButton.style.left = `${x}px`;
    musicButton.style.top = `${y}px`;
    musicButton.style.position = 'fixed';
  }
});

document.addEventListener('touchend', () => {
  isDraggingMusic = false;
  musicButton.style.transition = 'all 0.2s ease';
});

// === Toggle BGM play/pause
musicButton.addEventListener('click', () => {
  if (!bgm) return;

  if (bgm.paused) {
    bgm.play().then(() => {
      musicButton.classList.remove("music-off");
      musicButton.classList.add("music-on");
    }).catch(err => console.warn("Gagal play musik:", err));
  } else {
    bgm.pause();
    musicButton.classList.remove("music-on");
    musicButton.classList.add("music-off");
  }
});

//--end



function scrollToSection(id) {

  const el = document.getElementById(id);

  if (el) el.scrollIntoView({ behavior: 'smooth' });

}



function backToSplash() {

  sessionStorage.removeItem("invitationOpened");

  location.reload(); // 🔁 Refresh agar splash muncul kembali

}

let quickAccessMenu = document.getElementById("quickAccessMenu");
let scrollTimeout;

window.addEventListener("scroll", () => {
  // Sembunyikan menu saat scroll
  quickAccessMenu.classList.add("hide");

  // Hapus timeout sebelumnya
  clearTimeout(scrollTimeout);

  // Munculkan lagi setelah 1 detik tidak scroll
  scrollTimeout = setTimeout(() => {
    quickAccessMenu.classList.remove("hide");
  }, 1000);
});

//--
let logoHeader = document.getElementById("floatingLogoHeader");
let lastScroll = window.scrollY;

window.addEventListener("scroll", () => {
  let currentScroll = window.scrollY;

  if (currentScroll > lastScroll) {
    // Scroll down -> sembunyikan
    logoHeader.classList.add("hide");
  } else {
    // Scroll up -> munculkan
    logoHeader.classList.remove("hide");
  }

  lastScroll = currentScroll;
});

// === Background Handling


document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    bgm?.pause();

    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  } else {
    // ✅ Mainkan kembali BGM jika user kembali ke tab
    if (typeof bgm?.play === "function") {
      bgm.play().catch(err => console.warn("Autoplay gagal saat kembali ke tab:", err));
    }

    if (!pollingInterval) {
      startPollingUcapan();
    }
  }
});




















