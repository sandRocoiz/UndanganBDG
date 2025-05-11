// === 1. KONSTANTA DAN UTILITAS ===
const endpoint = "https://undangan-bdg.vercel.app/api/proxy";
const perPage = 5;
let currentPage = 1;
const maxWinners = 10;
const hadiahKey = "scratchWin";
const namaReservasiKey = "namaReservasi";

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

  // === AUDIO PLAY BGM with Fade-in
  const bgm = document.getElementById('bgm');
  if (bgm && typeof bgm.play === "function") {
    bgm.volume = 0;
    bgm.play().then(() => {
      let vol = 0;
      const fadeIn = setInterval(() => {
        if (vol < 0.5) {
          vol += 0.05;
          bgm.volume = Math.min(vol, 0.5);
        } else {
          clearInterval(fadeIn);
        }
      }, 200);
    }).catch(err => console.warn("Autoplay gagal:", err));
  }

  startCountdown();
  ambilUcapan();
  
  animateLetterDropById("weddingNames");
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
  const loading = document.getElementById("ucapanLoading") || { style: {} };
  const daftar = document.getElementById("daftarUcapan") || { style: {} };
  const filterCheckbox = document.getElementById("filterByUser");
  const filterAktif = filterCheckbox?.checked;
  const userId = getUserId();
  const url = new URL(endpoint);

  if (!filterAktif) {
    url.searchParams.set("limit", perPage);
    url.searchParams.set("page", currentPage);
  } else {
    url.searchParams.delete("limit");
    url.searchParams.delete("page");
  }

  loading.style.display = "block";
  daftar.style.display = "none";

  fetch(url.toString())
    .then(res => res.json())
    .then(result => {
      let semuaData = Array.isArray(result) ? result : result.data || [];

      if (filterAktif) {
        const approved = semuaData.filter(d => d.approved === "Y" || d.approved === true);
        
        const filtered = approved.filter(d => 
          (d.userId === userId && (d.is_ucapan === true || d.is_ucapan === "TRUE")) ||
          (d.thread && semuaData.find(ucapan => ucapan.id == d.thread && ucapan.userId === userId))
        );

        // ❗ TIDAK perlu pagination kalau filter aktif
        renderUcapan(filtered, filtered.length);

        // Scroll otomatis ke bawah setelah render (kaya WhatsApp)
        setTimeout(() => {
          daftar.scrollTop = daftar.scrollHeight;
        }, 500);

      } else {
        // Mode normal pakai pagination
        renderUcapan(semuaData, result.total || semuaData.length);
      }
    })
    .catch(err => console.error("Gagal ambil ucapan:", err))
    .finally(() => {
      loading.style.display = "none";
      daftar.style.display = "block";
    });
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
}



// ============================================
// FINAL PATCH: SCRATCH CARD SYSTEM CLEAN VERSION
// ============================================

// Fungsi setelah submit ucapan (untuk cek hadiah)
async function cekHadiahSetelahUcapan() {
  const menang = Math.random() < 0.8; // 80% chance
  localStorage.setItem("scratchResult", menang ? "MENANG" : "KALAH");

  if (menang) {
    const form = new URLSearchParams();
    form.append("action", "win"); // <== penting!
    form.append("userId", getUserId());

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
}

// Fungsi membuka Scratch Card
function bukaScratchCard() {
  const container = document.getElementById('scratchCardContainer');
  const rewardImage = document.getElementById('scratchRewardImage');
  const resultText = document.getElementById('scratchResultText');
  const closeBtn = document.getElementById('closeScratchBtn');
  const canvas = document.getElementById('scratchCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const menang = localStorage.getItem("scratchResult") === "MENANG";

  rewardImage.src = menang
    ? "https://undangan-bdg.vercel.app/Asset/win.png"
    : "https://undangan-bdg.vercel.app/Asset/lose.png";

  // ✅ Set Wording Instruksi saat pertama buka
  resultText.innerHTML = `
    <div class="scratch-message" style="font-size: 0.9rem; color: #555;">
      📜 <em>Mohon gosok bagian ini untuk melihat apakah Anda mendapatkan souvenir spesial!</em>
    </div>`;
  resultText.style.display = 'block';
  closeBtn.style.display = 'none';

  container.classList.remove('scratch-flash-win');
  container.style.display = 'flex';

  rewardImage.onload = () => {
    canvas.width = rewardImage.offsetWidth;
    canvas.height = rewardImage.offsetHeight;

    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-out";

    setupScratchEvents();
  };

  let isDrawing = false;
  
  let scratchFinished = false;

  function setupScratchEvents() {
  const scratchSound = new Audio("https://undangan-bdg.vercel.app/Asset/scratch-sound.mp3"); 
  scratchSound.loop = true;
  scratchSound.volume = 0.3;

  // === MOUSE EVENTS ===
  canvas.addEventListener('mousedown', () => {
    isDrawing = true;
    scratchSound.play().catch(() => {}); // Play suara saat mulai gosok
  });

  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    scratchSound.pause(); // Stop suara saat selesai gosok
  });

  canvas.addEventListener('mousemove', scratch);

  // === TOUCH EVENTS (Mobile) ===
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

  // 🚀 Cek langsung progress gosokan
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let cleared = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    if (imgData.data[i + 3] === 0) cleared++;
  }
  const percent = (cleared / (canvas.width * canvas.height)) * 100;
  
  scratchProgress = percent; // simpan progress di global variable

  if (percent > 50 && !scratchFinished) {
    scratchFinished = true;
    finishScratch();
  }
}



  

  function finishScratch() {
  canvas.style.pointerEvents = "none"; // Disable scratch interaksi

  setTimeout(() => {
    // Fade-out canvas pelan
    canvas.style.transition = "opacity 0.5s ease";
    canvas.style.opacity = "0";

    setTimeout(() => {
      // Setelah canvas hilang, tampilkan hasil Win/Lose
      resultText.innerHTML = menang
        ? `<div class="scratch-message">
             🎉 <strong>Selamat!</strong><br>
             Kamu mendapatkan souvenir spesial!<br>
             📸 <small>Screenshot layar ini & tunjukkan ke panitia ya!</small>
           </div>`
        : `<div class="scratch-message">
             😢 <em>Belum beruntung!</em><br>
             ✨ Terima kasih atas partisipasimu.<br>
           </div>`;

      closeBtn.style.display = 'block';

      // 🔥 Vibrasi sesuai hasil
      if (typeof window.navigator.vibrate === "function") {
        if (menang) {
          window.navigator.vibrate([100, 50, 100]);
        } else {
          window.navigator.vibrate(50);
        }
      }

      // 🔥 Flash efek kalau menang
      if (menang) {
        container.classList.add('scratch-flash-win');
        playSound('https://undangan-bdg.vercel.app/Asset/win-sound.mp3');
        container.style.animation = "flashBlink 0.7s ease-in-out";
      } else {
        playSound('https://undangan-bdg.vercel.app/Asset/lose-sound.mp3');
      }

    }, 500); // Delay setelah canvas fade-out
  }, 300); // Delay setelah scratch selesai
}


  closeBtn.onclick = () => {
    container.style.display = 'none';
  };
}




function playSound(url) {
  const audio = new Audio(url);
  audio.volume = 0; // Mulai dari 0
  audio.play().then(() => {
    // Fade in perlahan
    let vol = 0;
    const fade = setInterval(() => {
      if (vol < 0.8) { // Batas volume 0.8 (lebih empuk)
        vol += 0.05;
        audio.volume = vol;
      } else {
        clearInterval(fade);
      }
    }, 50); // setiap 50ms naikin volume
  }).catch(() => {});
}














// === 6. FORM RESERVASI ===
document.getElementById("formReservasi").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Cek apakah user sudah pernah reservasi
  if (localStorage.getItem("sudahReservasi") === "true") {
    tampilkanReservasiSudahSubmit();
    return;
  }

  const nama = document.getElementById("namaReservasi").value.trim();
  const status = document.getElementById("statusReservasi").value;

  // Validasi form input
  if (!nama || !status) {
    tampilkanStatusMsg("statusReservasiMsg", "Mohon isi nama dan status kehadiran.", "error");
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
      // ✅ Simpan data ke localStorage
      localStorage.setItem("namaReservasi", nama);
      localStorage.setItem("reservasiStatus", status);
      localStorage.setItem("sudahReservasi", "true");

      // ✅ Autofill nama ke form ucapan jika belum pernah submit ucapan
      if (localStorage.getItem("sudahSubmitUcapan") !== "true" && document.getElementById("nama")) {
        document.getElementById("nama").value = nama;
        localStorage.setItem("nama", nama);
      }

      tampilkanReservasiSudahSubmit();
      this.reset();

    } else if (text.trim() === "ALREADY_RESERVED") {
      localStorage.setItem("sudahReservasi", "true");
      tampilkanReservasiSudahSubmit();
    } else {
      tampilkanStatusMsg("statusReservasiMsg", "Gagal menyimpan reservasi.", "error");
    }

  } catch (err) {
    console.error("Error submit reservasi:", err);
    tampilkanStatusMsg("statusReservasiMsg", "Terjadi kesalahan koneksi.", "error");
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
    const head = messages.find(m => m.is_ucapan === "TRUE" || m.is_ucapan === true);
    return head && (!filterAktif || head.userId === userId);
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
    .forEach(msg => {
      const isHead = msg.is_ucapan === "TRUE" || msg.is_ucapan === true;
      const isAdmin = msg.nama?.toLowerCase() === "admin";
      const bubbleClass = isHead ? "head-ucapan" : isAdmin ? "reply-admin" : "reply-user";

      const bubbleWrapper = document.createElement("div");
      bubbleWrapper.className = `bubble-wrapper ${bubbleClass}`;

      const bubble = document.createElement("div");
      bubble.className = "bubble";
	  

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

  // === Tambahkan form chat reply hanya kalau filter aktif
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
      if (text) {
        kirimBalasanLanjutan(threadId, text, localStorage.getItem("nama") || "Anonim");
        input.value = ""; // Reset input setelah kirim
      }
    };

    wrapper.appendChild(replyForm);
  }

  daftar.appendChild(wrapper);
});

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
  const totalPages = Math.max(1, Math.ceil(totalUcapanFiltered / perPage));

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
  if (!ucapan.trim()) return alert("Balasan tidak boleh kosong!");

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
    alert("Balasan terkirim!");
    ambilUcapan();
  })
  .catch(err => {
    console.error("Gagal kirim balasan:", err);
    alert("Gagal kirim balasan.");
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









// === INISIALISASI FINAL PATCH ===
document.addEventListener("DOMContentLoaded", () => {
  const userId = getUserId();
  const display = document.getElementById("userIdValue");
  const namaUser = localStorage.getItem("nama");
  if (display) {
  if (namaUser) {
    display.innerHTML = `Hi, <strong>${namaUser}</strong> 👋`;
  } else {
    const userId = getUserId();
    display.innerHTML = `Hi, <small>${userId}</small>`;
  }
}

  // Prefill nama dari localStorage
  const namaPrefill = localStorage.getItem("nama");
  if (namaPrefill && document.getElementById("nama")) {
    document.getElementById("nama").value = namaPrefill;
  }

  // Cek status reservasi & ucapan DULU
  if (localStorage.getItem("sudahReservasi") === "true") {
    tampilkanReservasiSudahSubmit();
  }

  if (localStorage.getItem("sudahSubmitUcapan") === "true") {
    tampilkanUcapanSudahSubmit();
  }

  const splash = document.getElementById("splash");
  const mainContent = document.getElementById("mainContent");
  if (splash) splash.style.display = "flex";
  if (mainContent) mainContent.style.display = "none";

  const filter = document.getElementById("filterByUser");
  if (filter) {
    filter.addEventListener("change", () => {
      currentPage = 1;
      ambilUcapan();
    });
  }

  startCountdown();

  // Ambil daftar ucapan setelah semua setup done
  setTimeout(() => {
    ambilUcapan();
  }, 300);

  const rellax = new Rellax('.parallax-bg', {
  speed: window.innerWidth > 768 ? -4 : -2, // tablet lebih ringan
  center: true,
  round: true,
  vertical: true,
  horizontal: false
});

  const scrollElements = document.querySelectorAll(".scroll-reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  scrollElements.forEach((el) => observer.observe(el));

  // 🚀 Tambahan bagian random pantun penutup (di dalam DOMContentLoaded yang sama)
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
});

function animateWords(selector) {
  const container = document.querySelector(selector);
  if (!container) return;
  const text = container.innerText.trim();
  container.innerHTML = "";

  text.split(" ").forEach((word, idx) => {
    const span = document.createElement("span");
    span.textContent = word + " ";
    span.style.opacity = 0;
    span.style.display = "inline-block";
    span.style.transform = "translateY(20px)";
    span.style.animation = "fadeSlideUpSlow 1.5s ease-out forwards";
    span.style.animationDelay = `${idx * 0.25}s`; // ✨ Delay antar kata 0.25s slow
    container.appendChild(span);
  });
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
  if (e.deltaY !== 0) {
    e.preventDefault();
    track.scrollLeft += e.deltaY * 1.2;
  }
});

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

// === Background Music Handling
const bgm = document.getElementById("bgm");
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    bgm?.pause();
  } else {
    if (sessionStorage.getItem("invitationOpened") === "true") {
      bgm?.play().catch(err => console.warn("Autoplay gagal saat kembali ke tab:", err));
    }
  }
});
















