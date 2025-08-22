import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://osracolqgafwotunadgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcmFjb2xxZ2Fmd290dW5hZGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzk3ODAsImV4cCI6MjA3MDY1NTc4MH0.bD6onMXzsbPMxxINjaMfi7Fc1g63EJUa4ys8cd58Xgs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LINK_TUJUAN_SETELAH_VOTE = 'https://javanationalist.github.io/pemilossmaba'; 

const dapilSelect = document.getElementById('dapil-select');
const voteForm = document.getElementById('vote-form');
const voteContentArea = document.getElementById('vote-content-area');
const dapilPhoto = document.getElementById('dapil-photo');
const classListContainer = document.getElementById('class-list-container');
const submitButton = document.getElementById('submit-vote');
const confirmModal = document.getElementById('confirm-modal');
const confirmSummary = document.getElementById('confirm-summary');
const thankyouModal = document.getElementById('thankyou-modal');
const editChoiceBtn = document.getElementById('edit-choice-btn');
const confirmSubmitBtn = document.getElementById('confirm-submit-btn');

let dapilDataCache = [];
let collectedVotes = [];

async function loadDapil() {
    const { data, error } = await supabase.from('dapil').select('*').order('name');
    if (error) {
        console.error('Error fetching dapil:', error);
        dapilSelect.innerHTML = '<option>Gagal memuat dapil</option>';
        return;
    }
    dapilDataCache = data;
    dapilSelect.innerHTML = '<option value="">-- Pilih Dapil --</option>';
    data.forEach(d => {
        dapilSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
    });
}

dapilSelect.addEventListener('change', async (e) => {
    const dapilId = e.target.value;
    voteForm.style.display = 'none';
    classListContainer.innerHTML = '';
    submitButton.disabled = true;

    if (!dapilId) return;

    voteForm.style.display = 'block';
    const selectedDapil = dapilDataCache.find(d => d.id == dapilId);
    if (selectedDapil && selectedDapil.photo_url) {
        dapilPhoto.src = selectedDapil.photo_url;
        dapilPhoto.style.display = 'block';
    } else {
        dapilPhoto.style.display = 'none';
    }

    classListContainer.innerHTML = '<div class="skeleton-loader"></div>';

    const { data: kelasData, error } = await supabase
        .from('kelas')
        .select(`id, name, pengurus (id, name)`)
        .eq('dapil_id', dapilId)
        .order('name');

    if (error) {
        console.error('Error fetching class data:', error);
        classListContainer.innerHTML = '<p class="info-text">Gagal memuat data kelas.</p>';
        return;
    }

    renderClassesAndCandidates(kelasData);
});

// 3. Fungsi untuk me-render daftar kelas dan calonnya menggunakan radio button
function renderClassesAndCandidates(classes) {
    classListContainer.innerHTML = '';
    if (classes.length === 0) {
        classListContainer.innerHTML = '<p class="info-text">Belum ada kelas di Dapil ini.</p>';
        return;
    }

    classes.forEach(kelas => {
        const classGroup = document.createElement('div');
        classGroup.className = 'class-group';

        let candidatesHTML = '';
        if (kelas.pengurus.length > 0) {
            candidatesHTML = kelas.pengurus.map(pengurus => `
                <label class="candidate-radio-label">
                    <input type="radio" 
                           name="kelas-${kelas.id}" 
                           value="${pengurus.id}"
                           data-pengurus-name="${pengurus.name}"
                           data-kelas-name="${kelas.name}"
                           data-kelas-id="${kelas.id}"
                           required>
                    <div class="radio-card">
                        <span>${pengurus.name}</span>
                    </div>
                </label>
            `).join('');
        } else {
            candidatesHTML = '<p class="empty-text">Belum ada calon.</p>';
        }

        classGroup.innerHTML = `
            <h3 class="class-title">${kelas.name}</h3>
            <div class="candidate-radio-grid">
                ${candidatesHTML}
            </div>
        `;
        classListContainer.appendChild(classGroup);
    });
 
    if (classes.some(k => k.pengurus.length > 0)) {
        submitButton.disabled = false;
    }
}

voteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(voteForm);
    collectedVotes = [];
    confirmSummary.innerHTML = '';

    for (const [key, pengurusId] of formData.entries()) {
        const input = voteForm.querySelector(`input[value="${pengurusId}"]`);
        collectedVotes.push({
            pengurus_id: pengurusId,
            kelas_id: input.dataset.kelasId
        });

        confirmSummary.innerHTML += `<div class="summary-item"><strong>${input.dataset.kelasName}:</strong> ${input.dataset.pengurusName}</div>`;
    }

    if (collectedVotes.length === 0) {
        alert("Anda belum memilih satu calon pun.");
        return;
    }

    confirmModal.style.display = 'flex';
});

editChoiceBtn.addEventListener('click', () => {
    confirmModal.style.display = 'none';
});

confirmSubmitBtn.addEventListener('click', async () => {
    confirmModal.style.display = 'none';
    confirmSubmitBtn.disabled = true;
    confirmSubmitBtn.textContent = 'Mengirim...';

    const { error } = await supabase.from('votes').insert(collectedVotes);

    if (error) {
        console.error('Error submitting votes:', error);
        alert('Maaf, terjadi kesalahan saat mengirim suara Anda.');

        confirmSubmitBtn.disabled = false;
        confirmSubmitBtn.textContent = 'Ya, Kirim Suara';
        return;
    }

    thankyouModal.style.display = 'flex';

     setTimeout(() => {
        window.location.href = LINK_TUJUAN_SETELAH_VOTE;
    }, 10000); 
});

loadDapil();


