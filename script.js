// === KONSTANTA ===
const endpoint = "https://script.google.com/macros/s/AKfycbzJ4GIWbHa8PfbZPAa5pNlqVTRpcEA3Pzd7BSCz86FIzENiBBi6JT38xSFRzbmUuOzkng/exec";
let currentPage = 1;
const perPage = 5;

// === USER ID ===
function generateUserId() {
  const id = "usr_" + Math.random().toString(36).substring(2, 11);
  localStorage.setItem("userId", id);
  return id;
}

function getUserId() {
  return localStorage.getItem("userId") || generateUserId();
}

// === SUBMIT UCAPAN ===
function submitUcapan(e) {
  e.preventDefault();
  const nama = e.target.nama.value.trim();
  const ucapan = e.target.ucapan.value.trim();
  const userId = getUserId();

  if (!nama || !ucapan) return alert("Nama dan ucapan wajib diisi.");
  if (!userId) return alert("User ID tidak ditemukan.");

  localStorage.setItem("nama", nama);

  const form = new URLSearchParams();
  form.append("nama", nama);
  form.append("ucapan", ucapan);
  form.append("userId", userId);
  form.append("is_ucapan", "true"); // hanya ucapan yang dianggap TRUE

  fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  })
  .then(() => {
    alert("Ucapan berhasil dikirim!");
    e.target.reset();
    ambilUcapan();
  })
  .catch(err => {
    console.error("Gagal mengirim ucapan:", err);
    alert("Gagal mengirim ucapan. Coba lagi ya!");
  });
}

// === AMBIL UCAPAN ===
function ambilUcapan() {
  fetch(endpoint)
  .then(res => res.json())
  .then(data => {
    const approved = data.filter(d => d.approved === "Y");
    renderUcapan(approved);
  })
  .catch(err => {
    console.error("Gagal ambil ucapan:", err);
  });
}

// === RENDER UCAPAN ===
function renderUcapan(data) {
  const daftar = document.getElementById("daftarUcapan");
  const userId = getUserId();
  const filterCheckbox = document.getElementById("filterByUser");
  const threads = {};

  data.forEach(item => {
    const thread = item.thread || item.id;
    if (!threads[thread]) threads[thread] = [];
    threads[thread].push(item);
  });

  const filtered = Object.entries(threads).filter(([_, messages]) => {
    const head = messages.find(m => m.is_ucapan === "TRUE" || m.is_ucapan === true);
    return head && (!filterCheckbox.checked || head.userId === userId);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  if (currentPage > totalPages) currentPage = 1;
  const shown = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  daftar.innerHTML = "";
  shown.forEach(([threadId, messages]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "ucapan-thread";

    const head = messages.find(m => m.is_ucapan === "TRUE" || m.is_ucapan === true);
    wrapper.innerHTML += `
      <div class="bubble head-ucapan">
        <strong>${head.nama}</strong>
        <div>${head.ucapan}</div>
        <div class="ucapan-time">${formatWaktuIndo(head.timestamp)}</div>
      </div>
    `;

    messages
      .filter(m => m !== head) // selain ucapan utama
      .forEach(reply => {
        const isAdmin = reply.nama.toLowerCase() === "admin";
        wrapper.innerHTML += `
          <div class="bubble ${isAdmin ? 'reply-admin' : 'reply-user'}">
            <strong>${reply.nama}</strong>
            <div>${reply.ucapan}</div>
            <div class="ucapan-time">${formatWaktuIndo(reply.timestamp)}</div>
          </div>
        `;
      });
    if (head.userId === userId && head.reply) {
      const form = document.createElement("form");
      form.className = "form-reply-thread";
      form.innerHTML = `
        <textarea required placeholder="Balas admin..."></textarea>
        <button type="submit">Kirim</button>
      `;
      form.onsubmit = function (e) {
        e.preventDefault();
        kirimBalasanLanjutan(threadId, form.querySelector("textarea").value, head.nama);
      };
      wrapper.appendChild(form);
    }

    daftar.appendChild(wrapper);
  });

  renderPagination(totalPages);
}

// === KIRIM BALASAN LANJUTAN ===
function kirimBalasanLanjutan(threadId, ucapan, nama) {
  if (!ucapan.trim()) return alert("Balasan tidak boleh kosong!");
  const form = new URLSearchParams();
  form.append("userId", getUserId());
  form.append("nama", localStorage.getItem("nama") || nama);
  form.append("ucapan", ucapan);
  form.append("is_ucapan", "false"); // balasan dianggap bukan ucapan utama
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

// === PAGINATION ===
function renderPagination(totalPages) {
  const paginationDiv = document.getElementById("pagination") || document.createElement("div");
  paginationDiv.id = "pagination";
  paginationDiv.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.disabled = i === currentPage;
    btn.onclick = () => {
      currentPage = i;
      ambilUcapan();
    };
    paginationDiv.appendChild(btn);
  }

  const daftar = document.getElementById("daftarUcapan");
  if (!document.getElementById("pagination")) daftar.appendChild(paginationDiv);
}

// === FORMAT WAKTU ===
function formatWaktuIndo(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Waktu tidak diketahui";
  const tanggal = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const waktu = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${tanggal}, ${waktu} WIB`;
}

// === COUNTDOWN ===
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

// === SPLASH SCREEN ===
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
}

// === INISIALISASI ===
document.addEventListener("DOMContentLoaded", () => {
  const userId = getUserId();
  const display = document.getElementById("userIdValue");
  if (display) display.textContent = userId;

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
  ambilUcapan();
});

// === GALERI FOTO INTERAKTIF ===
const track = document.getElementById('carouselTrack');
let isDown = false;
let startX;
let scrollLeft;

track.addEventListener('mousedown', (e) => {
  isDown = true;
  track.classList.add('active');
  startX = e.pageX - track.offsetLeft;
  scrollLeft = track.scrollLeft;
});

track.addEventListener('mouseleave', () => {
  isDown = false;
  track.classList.remove('active');
});

track.addEventListener('mouseup', () => {
  isDown = false;
  track.classList.remove('active');
});

track.addEventListener('mousemove', (e) => {
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
    bgm.pause();
  } else {
    if (sessionStorage.getItem("invitationOpened") === "true") {
      bgm.play().catch(err => console.warn("Autoplay gagal saat kembali ke tab:", err));
    }
  }
});
