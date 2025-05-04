
document.addEventListener("DOMContentLoaded", function () {
  const slider = document.querySelector(".slider");
  const wrapper = document.querySelector(".reveal-wrapper");

  if (slider && wrapper) {
    slider.addEventListener("input", function () {
      wrapper.style.width = this.value + "%";
    });
  }
});

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

  fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ nama, ucapan }),
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
const perPage = 3;

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

document.addEventListener("DOMContentLoaded", function () {
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

  const track = document.getElementById('carouselTrack');
  if (!track) return;

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
});
