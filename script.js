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

  const bgm = document.getElementById('bgm');
  if (bgm && typeof bgm.play === 'function') {
    bgm.play().catch(err => console.warn("Autoplay gagal:", err));
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
  const filterAktif = document.getElementById("filterByUser")?.checked;
  const url = new URL(endpoint);

  if (!filterAktif) {
    url.searchParams.set("limit", perPage);
    url.searchParams.set("page", currentPage);
  }

  loading.style.display = "block";
  daftar.style.display = "none";

  fetch(url.toString())
    .then(res => res.json())
    .then(result => {
      let semuaData = Array.isArray(result) ? result : result.data || [];
      const approved = semuaData.filter(d => d.approved === "Y" || d.approved === true);
      const total = result.total || approved.length;
      renderUcapan(approved, total);
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



// === 5. SCRATCH CARD (BUKA & CEK HADIAH) ===
async function cekHadiahSetelahUcapan() {
  const nama = localStorage.getItem(namaReservasiKey);
  if (!nama) return;

  const pemenang = JSON.parse(localStorage.getItem("pemenang") || "[]");
  if (pemenang.length >= maxWinners) {
    console.log("Hadiah sudah habis");
    return;
  }

  if (localStorage.getItem(hadiahKey)) {
    bukaScratchCard();
    return;
  }

  const menang = Math.random() < 0.1;

  if (menang) {
    pemenang.push({ nama, waktu: new Date().toISOString() });
    localStorage.setItem("pemenang", JSON.stringify(pemenang));
    localStorage.setItem(hadiahKey, "MENANG");
  } else {
    localStorage.setItem(hadiahKey, "KALAH");
  }

  bukaScratchCard();
}



function bukaScratchCard() {
  const container = document.getElementById('scratchCardContainer');
  const resultText = document.getElementById('scratchResult');
  const canvas = document.getElementById('scratchCanvas');
  const closeBtn = document.getElementById('closeScratchBtn');
  const winSound = document.getElementById('winSound');
  const loseSound = document.getElementById('loseSound');

  const menang = localStorage.getItem("scratchWin") === "MENANG";
  resultText.textContent = menang
    ? "🎉 Kamu Menang Souvenir Special! 🎉"
    : "😢 Belum Beruntung. Semangat Lagi!";

  container.style.display = 'flex';
  container.classList.remove('scratch-flash-win');

  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;

  ctx.fillStyle = '#aaa';
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'destination-out';

  let isDrawing = false;

  function scratch(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    checkScratchProgress();
  }

  function checkScratchProgress() {
    const imageData = ctx.getImageData(0, 0, width, height);
    let scratched = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] < 128) { // pixel transparan
        scratched++;
      }
    }
    const scratchedPercent = scratched / (width * height) * 100;
    
    if (scratchedPercent > 50) {
      setTimeout(() => {
        container.classList.add('show-result');
        closeBtn.style.display = 'block';
      }, 500);
    }
  }

  canvas.addEventListener('mousedown', () => isDrawing = true);
  canvas.addEventListener('touchstart', () => isDrawing = true);
  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('touchend', () => isDrawing = false);
  canvas.addEventListener('mousemove', scratch);
  canvas.addEventListener('touchmove', scratch);

  // Play Sound + Flash + Confetti
  setTimeout(() => {
    if (menang) {
      winSound?.play();
      container.classList.add('scratch-flash-win');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      loseSound?.play();
    }
  }, 500);

  closeBtn.onclick = () => {
    container.style.display = 'none';
    closeBtn.style.display = 'none';
  };

  closeBtn.style.display = 'none'; // sembunyikan tombol dulu
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
  const threads = {};

  data.forEach(item => {
    const threadId = item.thread ?? item.id;
    if (!threads[threadId]) threads[threadId] = [];
    threads[threadId].push(item);
  });

  const filtered = Object.entries(threads).filter(([_, messages]) => {
    const head = messages.find(m => m.is_ucapan === "TRUE" || m.is_ucapan === true);
    return head && (!filterCheckbox.checked || head.userId === userId);
  });

  const filterAktif = filterCheckbox.checked;
  const shown = filtered;

  daftar.innerHTML = "";
  daftar.classList.remove("show");
  void daftar.offsetWidth;
  daftar.classList.add("fade-in", "show");

  // === HANDLE EMPTY STATE ===
  if (shown.length === 0) {
  const emptyDiv = document.createElement("div");
  emptyDiv.className = "ucapan-empty";
  emptyDiv.innerHTML = `
    <div class="empty-illustration">
      <img src="https://undangan-bdg.vercel.app/Asset/floating.png" alt="Belum ada ucapan" width="120" height="120">
    </div>
    <p>Belum ada ucapan masuk.<br><em>Yuk beri ucapan pertama! ✨</em></p>
  `;
  daftar.appendChild(emptyDiv);
}

  // === RENDER TIAP THREAD ===
  shown.forEach(([threadId, messages]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "ucapan-thread";

    messages.sort((a, b) =>
      new Date(a.timestamp || a.reply_timestamp || 0) - new Date(b.timestamp || b.reply_timestamp || 0)
    );

    messages.forEach((msg) => {
      const isHead = msg.is_ucapan === "TRUE" || msg.is_ucapan === true;
      const isAdmin = msg.nama.toLowerCase() === "admin";
      const bubbleClass = isHead ? "head-ucapan" : isAdmin ? "reply-admin" : "reply-user";

      const bubble = document.createElement("div");
bubble.className = `bubble ${bubbleClass}`;

let badgeWinner = "";
if (isHead && (msg.isWinner === true || msg.isWinner === "TRUE")) {
  badgeWinner = `<img src="https://undangan-bdg.vercel.app/Asset/win.png" alt="Pemenang" class="badge-winner">`;
}

bubble.innerHTML = `
  <div style="display:flex; align-items:center; gap:0.5em;">
    <strong>${msg.nama}</strong> ${badgeWinner}
  </div>
  <div>${msg.ucapan}</div>
  <div class="ucapan-time">
    ${msg.timestamp ? formatWaktuIndo(msg.timestamp) : '<em>Waktu tidak diketahui</em>'}
  </div>
`;
      wrapper.appendChild(bubble);

      if (isHead) {
        const likeDiv = renderLikes(msg.id, msg.likes || []);
        wrapper.appendChild(likeDiv);
      }
    });

    const main = messages.find(m => m.is_ucapan === "TRUE" || m.is_ucapan === true);
    if (main && main.userId === userId && messages.some(msg => msg.nama.toLowerCase() === "admin")) {
      const form = document.createElement("form");
      form.className = "form-reply-thread";
      form.innerHTML = `
        <textarea required placeholder="Balas admin..."></textarea>
        <button type="submit">Kirim</button>
      `;
      form.onsubmit = function (e) {
        e.preventDefault();
        kirimBalasanLanjutan(threadId, form.querySelector("textarea").value, main.nama);
      };
      wrapper.appendChild(form);
    }

    daftar.appendChild(wrapper);
  });

  const totalPages = filterAktif ? 1 : Math.ceil(totalUcapan / perPage);
  const paginationDiv = document.getElementById("pagination");
  if (paginationDiv) {
    paginationDiv.style.display = filterAktif ? "none" : "block";
  }

  renderPagination(totalPages);
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
  // Jika bukan array, ubah jadi array kosong
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
  likeContainer.querySelector("button").onclick = () => toggleLike(ucapanId, likedByUser);
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
  if (pageInfo) pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;

  const createBtn = (label, disabled = false, onClick = null) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.disabled = disabled;
    if (onClick) btn.onclick = onClick;
    return btn;
  };

  // Tombol Sebelumnya
  paginationDiv.appendChild(createBtn("←", currentPage === 1, () => {
    currentPage--;
    ambilUcapan();
  }));

  const pages = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage, "...", totalPages);
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
        currentPage = Number (p);
        ambilUcapan();
      });
      paginationDiv.appendChild(btn);
    }
  });

  // Tombol Berikutnya
  paginationDiv.appendChild(createBtn("→", currentPage === totalPages, () => {
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
  if (display) display.textContent = userId;

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
    speed: window.innerWidth > 768 ? -4 : -1
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
});

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





// === GALERI FOTO INTERAKTIF ===
const track = document.getElementById('carouselTrack');
let isDown = false;
let startX;
let scrollLeft;

track?.addEventListener('mousedown', (e) => {
  isDown = true;
  track.classList.add('active');
  startX = e.pageX - track.offsetLeft;
  scrollLeft = track.scrollLeft;
});

track?.addEventListener('mouseleave', () => {
  isDown = false;
  track.classList.remove('active');
});

track?.addEventListener('mouseup', () => {
  isDown = false;
  track.classList.remove('active');
});

track?.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - track.offsetLeft;
  const walk = (x - startX) * 1.5;
  track.scrollLeft = scrollLeft - walk;
});

document.querySelectorAll(".slider").forEach(slider => {
  const wrapper = slider.previousElementSibling;
  slider.addEventListener("input", function () {
    wrapper.style.width = this.value + "%";
  });
});

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















