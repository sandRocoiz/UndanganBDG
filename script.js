
function generateUserId() {
  // bikin ID random, misalnya: usr_5f1e8b3a2d
  const id = "usr_" + Math.random().toString(36).substring(2, 11);
  localStorage.setItem("userId", id);
  return id;
}

function getUserId() {
  let id = localStorage.getItem("userId");
  if (!id) {
    id = generateUserId();
  }
  return id;
}



function bukaFormBalas(id) {
  document.getElementById("balasIdTarget").value = id;
  document.getElementById("modalBalas").style.display = "flex";
}

function tutupModalBalas() {
  document.getElementById("modalBalas").style.display = "none";
}

function kirimBalasanAdmin() {
  const replyText = document.getElementById("inputBalasanAdmin").value;
  const idTarget = document.getElementById("balasIdTarget").value;
  const userId = getUserId();

  if (!replyText.trim()) {
    alert("Isi balasan dulu dong fren");
    return;
  }

  fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ replyToAdmin: replyText, id: idTarget, userId }),
    headers: { "Content-Type": "application/json" }
  }).then(() => {
    alert("Balasan berhasil dikirim ke admin!");
    tutupModalBalas();
    ambilUcapan();
  }).catch(err => {
    alert("Gagal kirim balasan.");
    console.error(err);
  });
}

const currentUserId = getUserId(); // dari localStorage

function renderUcapan(data) {
  const daftar = document.getElementById("daftarUcapan");
  daftar.innerHTML = "";

  // Group by thread
  const threadMap = {};

  data.forEach(item => {
    const threadId = item.threads;
    if (!threadMap[threadId]) threadMap[threadId] = [];
    threadMap[threadId].push(item);
  });

  Object.entries(threadMap).forEach(([threadId, items]) => {
    const head = items.find(i => i.is_ucapan === "TRUE");
    if (!head || head.approved !== "Y") return;

    const wrapper = document.createElement("div");
    wrapper.className = "ucapan-thread";

    // HEAD
    wrapper.innerHTML += `
      <div class="ucapan-card">
        <strong>${head.nama}</strong>
        <div>${head.ucapan}</div>
        ${head.reply ? `<div class="balasan-card"><div class="balasan-label">Balasan:</div><div class="balasan-teks">${head.reply}</div></div>` : ""}
      </div>
    `;

    // Sub Replies
    const replies = items.filter(i => i.is_ucapan === "FALSE");
    replies.forEach(reply => {
      wrapper.innerHTML += `
        <div class="ucapan-card sub-reply">
          <div><strong>${reply.nama}</strong> membalas:</div>
          <div>${reply.ucapan}</div>
        </div>
      `;
    });

    // Form reply user
    if (head.user_id === currentUserId && head.reply) {
      const form = document.createElement("form");
      form.innerHTML = `
        <textarea placeholder="Balas balasan admin..." required></textarea>
        <button type="submit">Kirim Balasan</button>
      `;
      form.onsubmit = function(e) {
        e.preventDefault();
        const ucapan = form.querySelector("textarea").value;
        kirimBalasanLanjutan(head.threads, ucapan);
      };
      wrapper.appendChild(form);
    }

    daftar.appendChild(wrapper);
  });
}

function kirimBalasanLanjutan(threadId, ucapan) {
  const payload = {
    user_id: getUserId(),
    nama: localStorage.getItem("nama") || "Anonim",
    ucapan,
    is_ucapan: false,
    threads: threadId
  };

  fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(() => {
    alert("Balasan terkirim!");
    ambilUcapan();
  });
}


function openInvitation() {
  sessionStorage.setItem("invitationOpened", "true");
  document.getElementById('splash').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  const bgm = document.getElementById('bgm');
  if (bgm && typeof bgm.play === 'function') {
    bgm.play().catch(err => {
      console.warn("Autoplay gagal, browser mungkin memblokir:", err);
    });
  }
  startCountdown();
  ambilUcapan();
}

window.onload = () => {
  // Generate userId kalau belum ada
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = crypto.randomUUID(); // Bisa juga pakai random string
    localStorage.setItem("userId", userId);
    alert("ID baru dibuat untuk Anda: " + userId);
  }

  // Tampilkan ID di halaman jika elemen tersedia
  const idDiv = document.getElementById("userIdDisplay");
  if (idDiv) idDiv.textContent = "ID Anda: " + userId;

  // Splash logic
  document.getElementById('splash').style.display = 'flex';
  document.getElementById('mainContent').style.display = 'none';

  ambilUcapan(); 
};


function startCountdown() {
  const countdownEl = document.getElementById('countdown');
  const target = new Date('2025-06-13T10:00:00').getTime();
  const interval = setInterval(() => {
    const now = new Date().getTime();
    const diff = target - now;
    if (diff <= 0) {
      clearInterval(interval);
      countdownEl.innerHTML = "Countdown telah berakhir. Atas kehadiran dan doa restunya kami ucapkan terima kasih.";
      return;
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    countdownEl.innerHTML = `${d} hari ${h} jam ${m} menit ${s} detik`;
  }, 1000);
}

const endpoint = "https://script.google.com/macros/s/AKfycbypZbnVQ1RzjFGXpvTecG-YIvOod4_4oA-fSUl_sCo79LDe_UbU0jgP6vOrzrGpAJKE/exec";

function submitUcapan(e) {
  e.preventDefault();
  
  const now = new Date().getTime();
  const deadline = new Date('2025-06-13T10:00:00').getTime();
  if (now > deadline) {
    alert("Ucapan telah ditutup. Terimakasih atas doa restunya.");
    return;
  }
  
  const nama = e.target.nama.value;
const ucapan = e.target.ucapan.value;
const userId = localStorage.getItem("userId"); // ambil user ID dari localStorage

  fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ nama, ucapan, userId }),
    headers: { "Content-Type": "application/json" }
  }).then(() => {
    alert("Ucapan berhasil dikirim!");
    document.getElementById("formUcapan").reset();
    ambilUcapan();
  }).catch(error => {
    alert("Gagal mengirim ucapan.");
    console.error("Submit error:", error);
  });
}

let currentPage = 1;
const perPage = 5;

function formatWaktuIndo(isoStr) {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "Waktu tidak diketahui";

  const optionsTanggal = { day: '2-digit', month: 'long', year: 'numeric' };
  const optionsWaktu = { hour: '2-digit', minute: '2-digit', hour12: false };
  const tanggal = date.toLocaleDateString('id-ID', optionsTanggal);
  const waktu = date.toLocaleTimeString('id-ID', optionsWaktu);

  return `${tanggal}, ${waktu} WIB`;
}

function ambilUcapan() {
  fetch(endpoint)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('daftarUcapan');
      const pagination = document.getElementById('pagination') || document.createElement('div');
      pagination.id = 'pagination';
      container.innerHTML = '';

      const filtered = data.filter(item => item.approved === "Y");
      const sorted = filtered.reverse();
      const totalPages = Math.ceil(sorted.length / perPage);
      const start = (currentPage - 1) * perPage;
      const end = start + perPage;
      const pageData = sorted.slice(start, end);

      pageData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'ucapan-card animate-fade-in';
        card.innerHTML = `
          <strong>${item.nama}</strong>
          <div>${item.ucapan}</div>
          <div class="ucapan-time">${formatWaktuIndo(item.timestamp)}</div>
          ${item.reply ? `
            <div class="balasan-card">
              <div class="balasan-label">Balasan:</div>
              <div class="balasan-teks">${item.reply}</div>
              ${item.reply_timestamp ? `<div class="balasan-time">${formatWaktuIndo(item.reply_timestamp)}</div>` : ''}
            </div>
          ` : ''}
        `;
		
		if (item.reply && item.userId === getUserId()) {
    const balasBtn = document.createElement("button");
    balasBtn.textContent = "Balas Admin";
    balasBtn.className = "btn-balas-admin";
    balasBtn.onclick = () => bukaFormBalas(item.id);
    card.appendChild(balasBtn);
  }
		
        container.appendChild(card);
      });

      pagination.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.disabled = true;
        btn.onclick = () => {
          currentPage = i;
          ambilUcapan();
        };
        pagination.appendChild(btn);
      }

      container.appendChild(pagination);
    })
    .catch(err => {
      console.error('Gagal ambil ucapan:', err);
    });
}



window.addEventListener("DOMContentLoaded", () => {
  // ========== 1. Generate / tampilkan user ID ==========
  const userId = getUserId();
  const display = document.getElementById("userIdValue");
  if (display) display.textContent = userId;

  const idDiv = document.getElementById("userIdDisplay");
  if (idDiv) idDiv.textContent = "ID Anda: " + userId;

  // ========== 2. Splash screen ==========
  document.getElementById('splash').style.display = 'flex';
  document.getElementById('mainContent').style.display = 'none';

  // ========== 3. Reveal slider logic ==========
  const slider = document.querySelector(".slider");
  const wrapper = document.querySelector(".reveal-wrapper");
  if (slider && wrapper) {
    slider.addEventListener("input", function () {
      wrapper.style.width = this.value + "%";
    });
  }

  // ========== 4. Fade-in Observer ==========
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });

  // ========== 5. Carousel drag scroll ==========
  const track = document.getElementById('carouselTrack');
  if (track) {
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
  }

  // ========== 6. Ambil ucapan awal ==========
  ambilUcapan();
});

