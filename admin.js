import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://osracolqgafwotunadgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcmFjb2xxZ2Fmd290dW5hZGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzk3ODAsImV4cCI6MjA3MDY1NTc4MH0.bD6onMXzsbPMxxINjaMfi7Fc1g63EJUa4ys8cd58Xgs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginPage = document.getElementById('login-page');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const resultsContainer = document.getElementById('results-container');
const dapilManagementContainer = document.getElementById('dapil-management-container');
const addDapilForm = document.getElementById('add-dapil-form');
const dapilFilterSelect = document.getElementById('dapil-filter-select');

async function handleAuthStateChange() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        loginPage.style.display = 'none';
        adminDashboard.style.display = 'flex';
        loadAdminData();
    } else {
        loginPage.style.display = 'flex';
        adminDashboard.style.display = 'none';
    }
}
loginForm.addEventListener('submit', async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email: e.target.email.value, password: e.target.password.value }); if (!error) handleAuthStateChange(); });
logoutBtn.addEventListener('click', async () => { await supabase.auth.signOut(); handleAuthStateChange(); });


async function loadAdminData() {
    const { data: dapilData, error } = await supabase.from('dapil').select(`
        id, name, photo_url,
        kelas ( id, name, pengurus ( id, name ) )
    `).order('name');
    
    if (error) { console.error("Error loading data:", error); return; }
    
    renderDapilManagement(dapilData);
    populateDapilFilter(dapilData);
    loadVoteResults();
}

function renderDapilManagement(dapilList) {
    dapilManagementContainer.innerHTML = '';
    if (dapilList.length === 0) {
        dapilManagementContainer.innerHTML = '<p>Belum ada Dapil.</p>';
        return;
    }

    dapilList.forEach(dapil => {
        const dapilCard = document.createElement('div');
        dapilCard.className = 'dapil-card card';
        dapilCard.innerHTML = `
            <div class="dapil-header">
                <h3>${dapil.name}</h3>
                <button class="button-danger small-btn" data-action="delete-dapil" data-id="${dapil.id}">Hapus Dapil</button>
            </div>
            <p class="photo-url-display">URL Foto: ${dapil.photo_url || '<em>Tidak ada</em>'}</p>

            <div id="kelas-management-${dapil.id}">
                ${dapil.kelas.map(k => `
                    <div class="kelas-management-block">
                        <div class="list-item">
                            <strong>Kelas: ${k.name}</strong>
                            <button class="delete-item-btn" data-action="delete-kelas" data-id="${k.id}">&times;</button>
                        </div>
                        <div class="pengurus-list">
                            ${k.pengurus.map(p => `
                                <div class="list-item-simple">
                                    <span>${p.name}</span>
                                    <button class="delete-item-btn small" data-action="delete-pengurus" data-id="${p.id}">&times;</button>
                                </div>
                            `).join('') || '<p class="empty-text">Belum ada calon.</p>'}
                        </div>
                        <form class="form-inline" data-action="add-pengurus" data-kelas-id="${k.id}">
                            <input type="text" placeholder="Nama Calon Baru" required>
                            <button type="submit" class="button-primary small-btn">Tambah</button>
                        </form>
                    </div>
                `).join('')}
            </div>

            <hr><form class="form-inline" data-action="add-kelas" data-dapil-id="${dapil.id}">
                <input type="text" placeholder="Nama Kelas Baru" required>
                <button type="submit" class="button-primary small-btn">Tambah Kelas</button>
            </form>
        `;
        dapilManagementContainer.appendChild(dapilCard);
    });
}

dapilManagementContainer.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    const id = e.target.dataset.id;

    if (action === 'delete-dapil') if (confirm('Yakin menghapus Dapil ini? Semua data terkait akan hilang.')) await supabase.from('dapil').delete().eq('id', id).then(loadAdminData);
    if (action === 'delete-kelas') if (confirm('Yakin menghapus kelas ini?')) await supabase.from('kelas').delete().eq('id', id).then(loadAdminData);
    if (action === 'delete-pengurus') if (confirm('Yakin menghapus calon ini?')) await supabase.from('pengurus').delete().eq('id', id).then(loadAdminData);
});

dapilManagementContainer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = e.target.dataset.action;
    const input = e.target.querySelector('input');

    if (action === 'add-kelas') await supabase.from('kelas').insert({ name: input.value, dapil_id: e.target.dataset.dapilId }).then(loadAdminData);
    if (action === 'add-pengurus') await supabase.from('pengurus').insert({ name: input.value, kelas_id: e.target.dataset.kelasId }).then(loadAdminData);
});

addDapilForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('dapil-name').value;
    const photo_url = document.getElementById('dapil-photo-url').value;
    await supabase.from('dapil').insert({ name, photo_url });
    addDapilForm.reset();
    loadAdminData();
});

function populateDapilFilter(dapilList) {
    dapilFilterSelect.innerHTML = '<option value="all">-- Semua Dapil --</option>';
    dapilList.forEach(d => { dapilFilterSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`; });
}
dapilFilterSelect.addEventListener('change', loadVoteResults);

async function loadVoteResults() {
    const dapilId = dapilFilterSelect.value;
    resultsContainer.innerHTML = '<p>Memuat hasil suara...</p>';

    let votes = [];
    let error = null;

    if (dapilId === 'all') {

        const response = await supabase
            .from('votes')
            .select('*, pengurus(*, kelas(*, dapil(*)))')
            .limit(1000000);
        votes = response.data;
        error = response.error;

    } else {

        const { data: pengurusInDapil, error: pengurusError } = await supabase
            .from('pengurus')
            .select('id, kelas!inner(dapil_id)')
            .eq('kelas.dapil_id', dapilId);

        if (pengurusError) {
            error = pengurusError;
        } else {

            const pengurusIds = pengurusInDapil.map(p => p.id);

            if (pengurusIds.length > 0) {
                const response = await supabase
                    .from('votes')
                    .select('*, pengurus(*, kelas(*, dapil(*)))')
                    .in('pengurus_id', pengurusIds)
                    .limit(1000000);
                votes = response.data;
                error = response.error;
            }
        }
    }

    if (error) { 
        console.error("Error loading votes:", error); 
        resultsContainer.innerHTML = `<p class="error-message">Gagal memuat suara: ${error.message}</p>`;
        return; 
    }
    
    resultsContainer.innerHTML = '';
    if (!votes || votes.length === 0) { 
        resultsContainer.innerHTML = '<p>Belum ada suara untuk filter ini.</p>'; 
        return; 
    }

    const resultsByClass = {};
    votes.forEach(vote => {
        if (!vote.pengurus || !vote.pengurus.kelas) return;
        const className = vote.pengurus.kelas.name;
        const pengurusName = vote.pengurus.name;
        if (!resultsByClass[className]) resultsByClass[className] = {};
        if (!resultsByClass[className][pengurusName]) resultsByClass[className][pengurusName] = 0;
        resultsByClass[className][pengurusName]++;
    });

    for (const className in resultsByClass) {
        let totalVotesInClass = Object.values(resultsByClass[className]).reduce((a, b) => a + b, 0);
        const classResultDiv = document.createElement('div');
        classResultDiv.className = 'result-class-group';
        classResultDiv.innerHTML = `<h4>${className} (${totalVotesInClass} suara)</h4>`;

        for (const pengurusName in resultsByClass[className]) {
            const count = resultsByClass[className][pengurusName];
            const percentage = totalVotesInClass > 0 ? ((count / totalVotesInClass) * 100).toFixed(1) : 0;
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <span>${pengurusName}</span>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%;">${percentage}%</div>
                </div>
                <strong>${count} suara</strong>
            `;
            classResultDiv.appendChild(resultItem);
        }
        resultsContainer.appendChild(classResultDiv);
    }
}

document.getElementById('reset-votes-btn').addEventListener('click', async () => {
    if (confirm('YAKIN? Ini akan menghapus SEMUA data suara.')) {
        await supabase.from('votes').delete().neq('id', -1);
        alert('Semua data suara berhasil direset.');
        loadVoteResults();
    }
});

handleAuthStateChange();


