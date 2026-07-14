// ==========================================
// INITIALIZE SUPABASE CLIENT WITH FALLBACK
// ==========================================
const supabaseLib = window.supabase || window.Supabase;
let supabaseClient = null;

// Pastikan library dan kredensial terdefinisi dan bukan placeholder bawaan
if (supabaseLib && 
    typeof SUPABASE_URL !== "undefined" && 
    typeof SUPABASE_ANON_KEY !== "undefined" &&
    SUPABASE_URL !== "https://your-project-ref.supabase.co" &&
    SUPABASE_URL !== "https://ganti-dengan-project-url-anda.supabase.co" &&
    SUPABASE_URL.trim() !== ""
) {
    supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully.");
} else {
    console.log("Supabase credentials not configured. Running in Static Fallback Mode.");
}

// ==========================================
// SESSION CHECKER & PROFILE RENDERING
// ==========================================
async function getLoggedUser() {
    // 1. Check Supabase Session
    if (supabaseClient) {
        const projectRef = "nwopquhapnuewpwumlad";
        const sessionStr = localStorage.getItem(`sb-${projectRef}-auth-token`);
        if (sessionStr) {
            try {
                const sessionObj = JSON.parse(sessionStr);
                if (sessionObj && sessionObj.user) {
                    const user = sessionObj.user;
                    // Ambil peran (role) dari tabel profiles secara aman di database
                    const { data: profile } = await supabaseClient
                        .from("profiles")
                        .select("role, full_name")
                        .eq("id", user.id)
                        .single();
                        
                    if (profile) {
                        return {
                            id: user.id,
                            name: profile.full_name,
                            role: profile.role,
                            email: user.email
                        };
                    } else {
                        return {
                            id: user.id,
                            name: user.user_metadata?.full_name || user.email,
                            role: "Tamu",
                            email: user.email
                        };
                    }
                }
            } catch (e) {
                console.error("Gagal membaca session Supabase:", e);
            }
        }
    }
    
    // 2. Check Mock Session
    const mockSessionStr = localStorage.getItem("mock_session");
    if (mockSessionStr) {
        try {
            const mockSession = JSON.parse(mockSessionStr);
            const mockUsers = JSON.parse(localStorage.getItem("mock_users") || "[]");
            const mockUser = mockUsers.find(u => u.email === mockSession.email);
            
            return {
                id: mockUser ? mockUser.id : "mock-id",
                name: mockSession.user_metadata?.full_name || "Supriyanto Pratama (Guest)",
                role: mockUser ? mockUser.role : (mockSession.user_metadata?.role || "Tamu"),
                email: mockSession.email
            };
        } catch (e) {
            console.error("Gagal membaca mock session:", e);
        }
    }
    return null;
}

async function checkSessionAndRenderSidebar() {
    const user = await getLoggedUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    // Update elements
    const elName = document.getElementById("sidebar-fullname");
    const elRole = document.getElementById("sidebar-role");
    const elAvatar = document.getElementById("sidebar-avatar");
    
    if (elName) elName.textContent = user.name;
    if (elRole) elRole.textContent = user.role;
    if (elAvatar) {
        const initials = user.name
            .split(" ")
            .filter(n => n.length > 0)
            .map(n => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
        elAvatar.textContent = initials || "SP";
    }

    // Bind Logout
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        // Remove existing listener to avoid duplication
        const newBtn = btnLogout.cloneNode(true);
        btnLogout.parentNode.replaceChild(newBtn, btnLogout);
        
        newBtn.addEventListener("click", async () => {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            localStorage.removeItem("mock_session");
            window.location.href = "login.html";
        });
    }

    // Role-Based Button Visibility on Dashboard
    const btnOpenModal = document.getElementById("btn-open-modal");
    if (btnOpenModal) {
        if (user.role !== "Supervisor AUR" && user.role !== "Admin Gudang") {
            btnOpenModal.style.display = "none";
        } else {
            btnOpenModal.style.display = "flex";
        }
    }

    // Show/Hide User Management menu item based on Supervisor role
    const navUsers = document.getElementById("nav-users");
    if (navUsers) {
        if (user.role === "Supervisor AUR") {
            navUsers.style.display = "block";
        } else {
            navUsers.style.display = "none";
        }
    }

    // Enforce Tamu Screen Block (Persetujuan Akun)
    if (user.role === "Tamu") {
        const dashboardMain = document.getElementById("view-dashboard");
        if (dashboardMain) {
            dashboardMain.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 64px 24px; text-align:center; min-height:60vh;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <i data-lucide="shield-alert" style="width:40px; height:40px; color:var(--danger);"></i>
                    </div>
                    <h3 style="font-weight: 700; color: var(--primary); margin-bottom: 8px; font-size:1.3rem;">Menunggu Persetujuan Akun</h3>
                    <p style="font-size:0.9rem; color:var(--text-secondary); max-width:440px; line-height:1.5;">Akun Anda berhasil didaftarkan namun belum disetujui untuk mengakses sistem operasional. Silakan hubungi **Supervisor AUR** untuk menyetujui akun Anda dan mengatur jabatan kerja Anda.</p>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }
}

// VIEW SWITCHER FOR SINGLE PAGE DASHBOARD
function switchView(viewName) {
    const dashboardView = document.getElementById("view-dashboard");
    const usersView = document.getElementById("view-users");
    const masterView = document.getElementById("view-master");
    const auditView = document.getElementById("view-audit");
    
    const navDashboard = document.getElementById("nav-dashboard");
    const navUsers = document.getElementById("nav-users");
    const navMaster = document.getElementById("nav-master");
    const navAudit = document.getElementById("nav-audit");
    
    // Hide all views
    if (dashboardView) dashboardView.style.display = "none";
    if (usersView) usersView.style.display = "none";
    if (masterView) masterView.style.display = "none";
    if (auditView) auditView.style.display = "none";
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll(".nav-menu .nav-item");
    navItems.forEach(item => item.classList.remove("active"));
    
    if (viewName === 'dashboard') {
        if (dashboardView) dashboardView.style.display = "block";
        if (navDashboard) navDashboard.classList.add("active");
    } else if (viewName === 'users') {
        if (usersView) usersView.style.display = "block";
        if (navUsers) navUsers.classList.add("active");
        loadUsersList();
    } else if (viewName === 'master') {
        if (masterView) masterView.style.display = "block";
        if (navMaster) navMaster.classList.add("active");
        loadMasterDataList();
    } else if (viewName === 'audit') {
        if (auditView) auditView.style.display = "block";
        if (navAudit) navAudit.classList.add("active");
        loadAuditLogsList();
    }
}

// Expose switchView to global window object
window.switchView = switchView;

// INITIALIZE LUCIDE ICONS ON PAGE LOAD
document.addEventListener("DOMContentLoaded", async () => {
    // Amankan halaman dengan Auth
    await checkSessionAndRenderSidebar();

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
    
    // Check if on Dashboard (index.html) or Detail page (detail.html)
    if (document.getElementById("jobs-table")) {
        initDashboard();
    } else if (document.getElementById("stepper-progress")) {
        initDetailPage();
    }
});

// ==========================================
// 1. DASHBOARD LOGIC (index.html)
// ==========================================
async function initDashboard() {
    const searchBox = document.getElementById("search-box");
    const filterStatus = document.getElementById("filter-status");
    const tableBody = document.querySelector("#jobs-table tbody");
    const rowCountBadge = document.getElementById("table-row-count");
    
    // Modal elements
    const addPoModal = document.getElementById("add-po-modal");
    const btnOpenModal = document.getElementById("btn-open-modal");
    const btnCloseModal = document.getElementById("btn-close-modal");
    const btnCancelModal = document.getElementById("btn-cancel-modal");
    const formNewPo = document.getElementById("form-new-po");

    // ------------------------------------------
    // REGISTER EVENT LISTENERS FIRST
    // ------------------------------------------
    if (btnOpenModal && addPoModal) {
        btnOpenModal.addEventListener("click", () => {
            addPoModal.classList.add("active");
            const dateInput = document.getElementById("estimasi");
            if (dateInput) {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 10);
                dateInput.value = futureDate.toISOString().split("T")[0];
            }
        });
    }

    const closeModal = () => {
        if (addPoModal) addPoModal.classList.remove("active");
        if (formNewPo) formNewPo.reset();
    };

    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener("click", closeModal);

    // Static fallback database (used only if Supabase is offline/not configured)
    let staticJobs = [
        { po: "PO-2026-0089", instansi: "PT Pertamina Hulu Rokan", plant: "Rumbai, Riau", alat: "Fluke 451B Ion Chamber", merk: "Fluke", tipe: "451B", serial: "SN-451B08821", stage: "Tahap 4", detail: "Masuk Lab BRIN (WO-89)", linkKardus: "https://t.me/c/12345/67", linkAlat: "https://t.me/c/12345/68", linkVideo: "https://t.me/c/12345/69", docType: "Sertifikat Resmi" },
        { po: "PO-2026-0090", instansi: "PT Indonesia Power Cilegon", plant: "Cilegon", alat: "Ludlum Model 3 Survey Meter", merk: "Ludlum", tipe: "Model 3", serial: "SN-L3-99827", stage: "Tahap 3", detail: "Menunggu Persetujuan Servis", linkKardus: "https://t.me/c/12345/70", linkAlat: "https://t.me/c/12345/71", linkVideo: "https://t.me/c/12345/72", docType: "Sertifikat Resmi" },
        { po: "PO-2026-0091", instansi: "RSUD Dr. Soetomo", plant: "Surabaya", alat: "Polimaster PM1703M", merk: "Polimaster", tipe: "PM1703M", serial: "SN-PM17-00912", stage: "Tahap 1", detail: "Admin Menerima Paket & Foto", linkKardus: "https://t.me/c/12345/73", linkAlat: "https://t.me/c/12345/74", linkVideo: "https://t.me/c/12345/75", docType: "Surat Keterangan" },
        { po: "PO-2026-0092", instansi: "PT Medco E&P Natuna", plant: "Natuna", alat: "Thermo RadEye PRD", merk: "Thermo", tipe: "RadEye PRD", serial: "SN-REPRD-7721", stage: "Tahap 6", detail: "Proses Upload Sertifikat", linkKardus: "https://t.me/c/12345/76", linkAlat: "https://t.me/c/12345/77", linkVideo: "https://t.me/c/12345/78", docType: "Sertifikat Resmi" },
        { po: "PO-2026-0093", instansi: "Universitas Gadjah Mada", plant: "Yogyakarta", alat: "Savel Gamma Area Monitor", merk: "Savel", tipe: "Gamma Area Monitor", serial: "SN-GAM-90082", stage: "Tahap 7", detail: "Dalam Pengiriman (Resi JNE)", linkKardus: "https://t.me/c/12345/79", linkAlat: "https://t.me/c/12345/80", linkVideo: "https://t.me/c/12345/81", docType: "Sertifikat Resmi" }
    ];

    // Search and Filter Function
    function filterTable() {
        if (!tableBody) return;
        const query = searchBox ? searchBox.value.toLowerCase() : "";
        const selectedStatus = filterStatus ? filterStatus.value : "all";
        const rows = tableBody.querySelectorAll("tr");
        let visibleCount = 0;

        rows.forEach(row => {
            const textContent = row.textContent.toLowerCase();
            const rowStatus = row.getAttribute("data-status");
            
            const matchesSearch = textContent.includes(query);
            const matchesStatus = (selectedStatus === "all") || (rowStatus === selectedStatus);

            if (matchesSearch && matchesStatus) {
                row.style.display = "";
                visibleCount++;
            } else {
                row.style.display = "none";
            }
        });

        if (rowCountBadge) rowCountBadge.textContent = `${visibleCount} Data Ditampilkan`;
    }

    if (searchBox) searchBox.addEventListener("input", filterTable);
    if (filterStatus) filterStatus.addEventListener("change", filterTable);

    // Handle form submission (Dynamic Database Insertion / Mock Fallback)
    if (formNewPo) {
        formNewPo.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const poNum = document.getElementById("po-number").value;
            const instansi = document.getElementById("instansi").value;
            const plant = document.getElementById("plant").value;
            const estimasi = document.getElementById("estimasi").value;
            const alatName = document.getElementById("alat-name").value;
            const merk = document.getElementById("merk").value;
            const tipe = document.getElementById("tipe").value;
            const serial = document.getElementById("serial-number").value;
            const docType = document.getElementById("document-type").value;
            const linkKardus = document.getElementById("link-foto-kardus").value;
            const linkAlat = document.getElementById("link-foto-alat").value;
            const linkVideo = document.getElementById("link-video-unboxing").value;

            if (supabaseClient) {
                // RILL DATABASE WRITE
                const submitBtn = formNewPo.querySelector("button[type='submit']");
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> Menyimpan...`;
                if (typeof lucide !== "undefined") lucide.createIcons();

                try {
                    // 1. Simpan PO
                    const { data: poData, error: poError } = await supabaseClient
                        .from("pos")
                        .insert([{ po_number: poNum, instansi, plant, estimasi_selesai: estimasi }])
                        .select();

                    if (poError) throw poError;

                    // 2. Simpan Alat
                    const { data: alatData, error: alatError } = await supabaseClient
                        .from("alats")
                        .insert([{
                            po_id: poData[0].id,
                            alat_name: alatName,
                            merk,
                            tipe,
                            serial_number: serial,
                            current_stage: 1,
                            status_detail: "Admin Menerima Paket & Foto",
                            link_foto_kardus: linkKardus,
                            link_foto_alat: linkAlat,
                            link_video_unboxing: linkVideo,
                            document_type: docType
                        }])
                        .select();

                    if (alatError) throw alatError;

                    // 3. Catat Timeline Log
                    const loggedUser = await getLoggedUser();
                    const { error: logError } = await supabaseClient
                        .from("timeline_logs")
                        .insert([{
                            alat_id: alatData[0].id,
                            stage: 1,
                            operator_name: loggedUser?.name || "Rian (Admin)",
                            action_detail: "menerima paket alat di gudang, melakukan unboxing, mengunggah foto, dan memvalidasi berkas PO Pelanggan."
                        }]);

                    if (logError) throw logError;

                    alert(`Sukses! PO ${poNum} berhasil didaftarkan di database Supabase.`);
                    closeModal();
                    await loadJobsFromSupabase();
                } catch (err) {
                    console.error("Gagal menyimpan ke database:", err);
                    alert(`Error Database: ${err.message}`);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    if (typeof lucide !== "undefined") lucide.createIcons();
                }
            } else {
                // STATIC FALLBACK ROW INSERTION
                const newJob = {
                    po: poNum,
                    instansi,
                    plant,
                    alat: `${merk} ${tipe} ${alatName}`,
                    merk,
                    tipe,
                    serial,
                    stage: "Tahap 1",
                    detail: "Admin Menerima Paket & Foto",
                    linkKardus,
                    linkAlat,
                    linkVideo,
                    docType
                };
                
                staticJobs.unshift(newJob);
                renderTableRows(staticJobs);
                updateDashboardMetrics(staticJobs);
                closeModal();
                alert(`Sukses (Simulasi)! Alat dengan PO ${poNum} berhasil ditambahkan secara statis.`);
            }
        });
    }

    // ------------------------------------------
    // LOAD DATA ASYNCHRONOUSLY AT THE END (NON-BLOCKING)
    // ------------------------------------------
    try {
        if (supabaseClient) {
            await loadJobsFromSupabase();
        } else {
            renderTableRows(staticJobs);
            updateDashboardMetrics(staticJobs);
        }
    } catch (err) {
        console.error("Error during table initialization:", err);
        renderTableRows(staticJobs);
        updateDashboardMetrics(staticJobs);
    }

    // Load Jobs from Supabase
    async function loadJobsFromSupabase() {
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-secondary);"><i data-lucide="loader-2" class="animate-spin" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:8px;"></i> Memuat data dari Supabase...</td></tr>`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        try {
            const { data, error } = await supabaseClient
                .from("alats")
                .select("*, pos(*)")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const jobs = data.map(item => ({
                po: item.pos.po_number,
                instansi: item.pos.instansi,
                plant: item.pos.plant,
                alat: `${item.merk} ${item.tipe} ${item.alat_name}`,
                merk: item.merk,
                tipe: item.tipe,
                serial: item.serial_number,
                stage: `Tahap ${item.current_stage}`,
                detail: item.status_detail,
                linkKardus: item.link_foto_kardus,
                linkAlat: item.link_foto_alat,
                linkVideo: item.link_video_unboxing,
                docType: item.document_type
            }));

            renderTableRows(jobs);
            updateDashboardMetrics(jobs);
        } catch (err) {
            console.error("Gagal memuat data dari Supabase:", err);
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--danger);"><i data-lucide="alert-circle" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:8px;"></i> Koneksi gagal: ${err.message}. Menggunakan data simulasi.</td></tr>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            setTimeout(() => {
                renderTableRows(staticJobs);
                updateDashboardMetrics(staticJobs);
            }, 2000);
        }
    }

    // Render Rows into HTML Table
    function renderTableRows(jobsList) {
        if (!tableBody) return;
        tableBody.innerHTML = "";
        if (jobsList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-secondary);">Tidak ada data pekerjaan AUR yang aktif.</td></tr>`;
            return;
        }

        jobsList.forEach(job => {
            const tr = document.createElement("tr");
            tr.setAttribute("data-status", job.stage);
            
            let badgeClass = "badge-neutral";
            if (job.stage === "Tahap 3" || job.stage === "Tahap 5") badgeClass = "badge-warning";
            else if (job.stage === "Tahap 4" || job.stage === "Tahap 6") badgeClass = "badge-info";
            else if (job.stage === "Tahap 7") badgeClass = "badge-success";

            tr.innerHTML = `
                <td><strong>${job.po}</strong></td>
                <td>${job.instansi}</td>
                <td>${job.alat}</td>
                <td>${job.serial}</td>
                <td><span class="badge ${badgeClass}">${job.stage}</span></td>
                <td>${job.detail}</td>
                <td><a href="detail.html?po=${job.po}&instansi=${encodeURIComponent(job.instansi)}&plant=${encodeURIComponent(job.plant)}&alat=${encodeURIComponent(job.alat)}&merk=${encodeURIComponent(job.merk)}&tipe=${encodeURIComponent(job.tipe)}&serial=${encodeURIComponent(job.serial)}&kardus=${encodeURIComponent(job.linkKardus)}&alatLink=${encodeURIComponent(job.linkAlat)}&video=${encodeURIComponent(job.linkVideo)}&docType=${encodeURIComponent(job.docType || 'Sertifikat Resmi')}" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;">Detail <i data-lucide="chevron-right" style="width:14px;height:14px;"></i></a></td>
            `;
            tableBody.appendChild(tr);
        });

        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
        if (rowCountBadge) rowCountBadge.textContent = `${jobsList.length} Data Ditampilkan`;
    }

    // Update metrics cards dynamically based on dataset
    function updateDashboardMetrics(jobsList) {
        const activePo = jobsList.length;
        const inService = jobsList.filter(j => j.stage === "Tahap 3").length;
        const inCalibration = jobsList.filter(j => j.stage === "Tahap 4").length;
        const shippedToday = jobsList.filter(j => j.stage === "Tahap 7").length;

        const elPo = document.getElementById("metric-po-active");
        const elSvc = document.getElementById("metric-service");
        const elCal = document.getElementById("metric-calibration");
        const elShp = document.getElementById("metric-shipment");

        if (elPo) elPo.textContent = activePo;
        if (elSvc) elSvc.textContent = inService;
        if (elCal) elCal.textContent = inCalibration;
        if (elShp) elShp.textContent = shippedToday;
    }

    // Load recent activities and deadlines dynamically from Supabase
    await loadRecentOperationalActivities();
    await loadApproachingDeadlines();

    // Check URL view parameters (e.g. from detail.html redirects)
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    if (viewParam) {
        switchView(viewParam);
    }
}

// ==========================================
// USER MANAGEMENT VIEW LOGIC (users-table)
// ==========================================
async function loadUsersList() {
    const tableBody = document.querySelector("#users-table tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-secondary);"><i data-lucide="loader-2" class="animate-spin" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:8px;"></i> Memuat data staf...</td></tr>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    
    let users = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: true });
            if (error) throw error;
            users = data || [];
        } catch (e) {
            console.error("Gagal memuat profil staf:", e);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--danger);">Koneksi database gagal: ${e.message}</td></tr>`;
            return;
        }
    } else {
        users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    }
    
    tableBody.innerHTML = "";
    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-secondary);">Tidak ada staf yang terdaftar di database.</td></tr>`;
        return;
    }
    
    const currentUser = await getLoggedUser();
    
    users.forEach(u => {
        const tr = document.createElement("tr");
        const dateStr = new Date(u.created_at || Date.now()).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        
        const roles = ["Supervisor AUR", "Admin Gudang", "Teknisi Lab", "Finance", "Logistik", "Tamu"];
        let optionsHtml = roles.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join("");
        
        const isSelf = currentUser && currentUser.id === u.id;
        const selectDisabled = isSelf ? "disabled" : "";
        
        tr.innerHTML = `
            <td><strong>${u.full_name} ${isSelf ? '<span class="badge badge-neutral" style="font-size:0.6rem;padding:2px 4px;margin-left:4px;">Anda</span>' : ''}</strong></td>
            <td>${u.email}</td>
            <td>${dateStr}</td>
            <td>
                <select onchange="updateUserRole('${u.id}', this.value)" class="form-select" style="font-size:0.8rem; padding:4px 8px; width:auto; display:inline-block;" ${selectDisabled}>
                    ${optionsHtml}
                </select>
            </td>
            <td>
                ${isSelf ? '<span style="font-size:0.75rem; color:var(--text-secondary);">Tidak dapat mendemosi akun sendiri</span>' : `<span style="font-size:0.75rem; color:var(--text-secondary);"><i data-lucide="refresh-cw" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> Otomatis Tersimpan</span>`}
            </td>
        `;
        tableBody.appendChild(tr);
    });
    
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

async function updateUserRole(userId, newRole) {
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from("profiles")
                .update({ role: newRole })
                .eq("id", userId);
            if (error) throw error;
            alert(`Berhasil! Jabatan staf diperbarui menjadi "${newRole}".`);
            await checkSessionAndRenderSidebar();
            await loadUsersList();
        } catch (e) {
            console.error("Gagal mengupdate peran:", e);
            alert(`Gagal memperbarui peran: ${e.message}`);
        }
    } else {
        let mockUsers = JSON.parse(localStorage.getItem("mock_users") || "[]");
        mockUsers = mockUsers.map(u => {
            if (u.id === userId) u.role = newRole;
            return u;
        });
        localStorage.setItem("mock_users", JSON.stringify(mockUsers));
        alert(`Sukses (Simulasi)! Jabatan diperbarui menjadi "${newRole}".`);
        await checkSessionAndRenderSidebar();
        await loadUsersList();
    }
}

// Expose globally
window.updateUserRole = updateUserRole;

// ==========================================
// MASTER DATA & AUDIT LOG LOAD LOGIC
// ==========================================
async function loadMasterDataList() {
    const tableBody = document.querySelector("#master-table tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-secondary);"><i data-lucide="loader-2" class="animate-spin" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:8px;"></i> Memuat data master...</td></tr>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    
    let alats = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from("alats")
                .select("*, pos(*)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            alats = data || [];
        } catch (e) {
            console.error("Gagal memuat master data:", e);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--danger);">Koneksi database gagal: ${e.message}</td></tr>`;
            return;
        }
    } else {
        // Fallback to static data
        alats = [
            { id: "1", merk: "Fluke", tipe: "451B", serial_number: "SN-451B08821", alat_name: "Ion Chamber", pos: { po_number: "PO-2026-0089", instansi: "PT Pertamina Hulu Rokan", plant: "Rumbai, Riau" } },
            { id: "2", merk: "Ludlum", tipe: "Model 3", serial_number: "SN-L3-99827", alat_name: "Survey Meter", pos: { po_number: "PO-2026-0090", instansi: "PT Indonesia Power Cilegon", plant: "Cilegon" } },
            { id: "3", merk: "Polimaster", tipe: "PM1703M", serial_number: "SN-PM17-00912", alat_name: "Personal Radiation Detector", pos: { po_number: "PO-2026-0091", instansi: "RSUD Dr. Soetomo", plant: "Surabaya" } }
        ];
    }
    
    tableBody.innerHTML = "";
    if (alats.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-secondary);">Tidak ada data alat di database.</td></tr>`;
        return;
    }
    
    alats.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.pos ? item.pos.po_number : '-'}</strong></td>
            <td>${item.merk} ${item.tipe} (${item.alat_name})</td>
            <td>${item.serial_number}</td>
            <td>${item.pos ? item.pos.instansi : '-'}</td>
            <td>${item.pos ? item.pos.plant : '-'}</td>
            <td><span class="badge badge-success">Terdaftar</span></td>
        `;
        tableBody.appendChild(tr);
    });
    
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

async function loadAuditLogsList() {
    const timelineContainer = document.getElementById("audit-timeline-container");
    if (!timelineContainer) return;
    
    timelineContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-secondary);"><i data-lucide="loader-2" class="animate-spin" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:8px;"></i> Memuat log audit...</div>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    
    let logs = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from("timeline_logs")
                .select("*, alats(*, pos(*))")
                .order("created_at", { ascending: false });
            if (error) throw error;
            logs = data || [];
        } catch (e) {
            console.error("Gagal memuat audit log:", e);
            timelineContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--danger);">Koneksi database gagal: ${e.message}</div>`;
            return;
        }
    } else {
        // Fallback static audit logs
        logs = [
            { id: "1", created_at: new Date().toISOString(), operator_name: "Rian (Admin)", action_detail: "menerima paket alat di gudang, melakukan unboxing, mengunggah foto, dan memvalidasi berkas PO Pelanggan.", stage: 1, alats: { serial_number: "SN-PM17-00912", merk: "Polimaster", tipe: "PM1703M", pos: { po_number: "PO-2026-0091" } } },
            { id: "2", created_at: new Date(Date.now() - 3600000).toISOString(), operator_name: "Agus (Teknisi)", action_detail: "melakukan inspeksi kelistrikan fisik alat. Sirkuit detektor diperiksa.", stage: 2, alats: { serial_number: "SN-L3-99827", merk: "Ludlum", tipe: "Model 3", pos: { po_number: "PO-2026-0090" } } }
        ];
    }
    
    timelineContainer.innerHTML = "";
    if (logs.length === 0) {
        timelineContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-secondary);">Tidak ada catatan log aktivitas.</div>`;
        return;
    }
    
    let html = "";
    logs.forEach(item => {
        const formattedTime = new Date(item.created_at).toLocaleString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        
        let itemStyle = "info";
        if (item.stage === 1 || item.stage === 7) itemStyle = "success";
        else if (item.stage === 2) itemStyle = "warning";
        else if (item.stage === 5) itemStyle = "warning";
        
        const poNum = item.alats && item.alats.pos ? item.alats.pos.po_number : "N/A";
        const alatDesc = item.alats ? `${item.alats.merk} ${item.alats.tipe} (SN: ${item.alats.serial_number})` : "";
        
        html += `
            <div class="timeline-feed-item ${itemStyle}" style="margin-bottom: 20px;">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span style="font-weight: 700; color: var(--primary-light);">${item.operator_name}</span> 
                    ${item.action_detail} 
                    <span class="badge badge-neutral" style="font-size:0.65rem; padding: 2px 6px; margin-left: 6px;">PO: ${poNum}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-top:4px;">Alat: ${alatDesc}</span>
                </div>
                <div class="timeline-time" style="font-size:0.7rem; color:var(--text-muted); margin-top: 4px;">${formattedTime}</div>
            </div>`;
    });
    
    timelineContainer.innerHTML = html;
    
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

// ==========================================
// 2. DETAIL WORKFLOW LOGIC (detail.html)
// ==========================================
let currentStage = 4; // Default stage
let currentToolId = null; // Stored tool uuid for supabase queries

async function initDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const poParam = params.get("po");
    
    if (poParam) {
        if (supabaseClient) {
            // Load real tool data from Supabase
            await loadToolDetailsFromSupabase(poParam);
        } else {
            // Load data from URL params as static mockup fallback
            const elPo = document.getElementById("meta-po-number");
            const elInst = document.getElementById("meta-instansi");
            const elPlt = document.getElementById("meta-plant");
            const elBrand = document.getElementById("meta-brand-model");
            const elSerial = document.getElementById("meta-serial");
            const elDocType = document.getElementById("meta-document-type");
            const elTitle = document.getElementById("detail-tool-title");
            
            if (elPo) elPo.textContent = poParam;
            if (elInst) elInst.textContent = params.get("instansi") || "PT Pertamina Hulu Rokan";
            if (elPlt) elPlt.textContent = params.get("plant") || "Rumbai, Riau";
            const brandModel = (params.get("merk") || "Fluke") + " / " + (params.get("tipe") || "451B");
            if (elBrand) elBrand.textContent = brandModel;
            if (elSerial) elSerial.textContent = params.get("serial") || "SN-451B08821";
            if (elDocType) elDocType.textContent = params.get("docType") || "Sertifikat Resmi";
            
            const toolTitle = (params.get("merk") || "Fluke") + " " + (params.get("tipe") || "451B") + " " + (params.get("alat") || "Ion Chamber") + " (" + (params.get("serial") || "SN-451B08821") + ")";
            if (elTitle) elTitle.textContent = toolTitle;
            
            const elKardus = document.getElementById("meta-foto-kardus-link");
            const elAlatLink = document.getElementById("meta-foto-alat-link");
            const elVideo = document.getElementById("meta-video-unboxing-link");

            if (elKardus) elKardus.textContent = params.get("kardus") || "https://t.me/c/12345/67";
            if (elAlatLink) elAlatLink.textContent = params.get("alatLink") || "https://t.me/c/12345/68";
            if (elVideo) elVideo.textContent = params.get("video") || "https://t.me/c/12345/69";
            
            currentStage = 4; 
            await setDemoStage(currentStage);
        }
    }
}

// Load real data from Supabase DB on Detail page
async function loadToolDetailsFromSupabase(poParam) {
    try {
        const { data, error } = await supabaseClient
            .from("alats")
            .select("*, pos!inner(*)")
            .eq("pos.po_number", poParam);

        if (error) throw error;
        if (!data || data.length === 0) {
            alert("Alat tidak ditemukan di database.");
            return;
        }

        const tool = data[0];
        currentToolId = tool.id;

        const elPo = document.getElementById("meta-po-number");
        const elInst = document.getElementById("meta-instansi");
        const elPlt = document.getElementById("meta-plant");
        const elBrand = document.getElementById("meta-brand-model");
        const elSerial = document.getElementById("meta-serial");
        const elDocType = document.getElementById("meta-document-type");
        const elTitle = document.getElementById("detail-tool-title");

        if (elPo) elPo.textContent = tool.pos.po_number;
        if (elInst) elInst.textContent = tool.pos.instansi;
        if (elPlt) elPlt.textContent = tool.pos.plant;
        if (elBrand) elBrand.textContent = `${tool.merk} / ${tool.tipe}`;
        if (elSerial) elSerial.textContent = tool.serial_number;
        if (elDocType) elDocType.textContent = tool.document_type || "Sertifikat Resmi";
        
        const toolTitle = `${tool.merk} ${tool.tipe} ${tool.alat_name} (${tool.serial_number})`;
        if (elTitle) elTitle.textContent = toolTitle;
        
        const elKardus = document.getElementById("meta-foto-kardus-link");
        const elAlatLink = document.getElementById("meta-foto-alat-link");
        const elVideo = document.getElementById("meta-video-unboxing-link");

        if (elKardus) elKardus.textContent = tool.link_foto_kardus || "https://t.me/c/12345/67";
        if (elAlatLink) elAlatLink.textContent = tool.link_foto_alat || "https://t.me/c/12345/68";
        if (elVideo) elVideo.textContent = tool.link_video_unboxing || "https://t.me/c/12345/69";
        
        // Load initial state
        currentStage = tool.current_stage;
        await setDemoStage(currentStage);
    } catch (err) {
        console.error("Gagal mengambil data detail alat:", err);
        alert(`Gagal koneksi database Supabase: ${err.message}. Menjalankan demo statis.`);
        supabaseClient = null; // Switch to fallback mode
        initDetailPage();
    }
}

// Global function called by demo control buttons
async function setDemoStage(stageNum) {
    // ------------------------------------------
    // ENFORCE ROLE-BASED ACCESS CONTROL (RBAC)
    // ------------------------------------------
    const user = await getLoggedUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const rolePermissions = {
        "Supervisor AUR": [1, 2, 3, 4, 5, 6, 7], // Semua tahap
        "Admin Gudang": [1, 5, 6],                // Penerimaan, Tagihan, dan Dokumen
        "Teknisi Lab": [2, 3, 4],                 // Inspeksi, Servis, dan Kalibrasi
        "Finance": [5],                           // Tagihan & Invoice
        "Logistik": [7],                          // Pengiriman
        "Tamu": []                                // Menunggu persetujuan
    };

    const allowedStages = rolePermissions[user.role] || [];
    if (!allowedStages.includes(stageNum)) {
        alert(`Akses Ditolak!\n\nPeran Anda: "${user.role}" tidak memiliki wewenang untuk mengubah status pekerjaan ke Tahap ${stageNum}.`);
        return;
    }

    currentStage = stageNum;
    
    // 1. Update Progress Bar
    const progressEl = document.getElementById("stepper-progress");
    if (progressEl) {
        const percent = ((stageNum - 1) / 6) * 100;
        progressEl.style.width = `${percent}%`;
    }

    // 2. Update Step States (active, completed)
    for (let i = 1; i <= 7; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (!stepEl) continue;
        
        stepEl.classList.remove("active", "completed");
        if (i < stageNum) {
            stepEl.classList.add("completed");
        } else if (i === stageNum) {
            stepEl.classList.add("active");
        }
    }

    // 3. Update Badge & Text Status
    const statusBadge = document.getElementById("meta-status-badge");
    const statusTextList = [
        "Tahap 1: Alat Diterima (Admin)",
        "Tahap 2: Pemeriksaan Awal (Teknisi)",
        "Tahap 3: Penawaran Servis (Menunggu Customer)",
        "Tahap 4: Kalibrasi Lab (BRIN/BPAFK)",
        "Tahap 5: Billing & Pembayaran",
        "Tahap 6: Penerbitan Sertifikat",
        "Tahap 7: Pengiriman Balik ke Customer"
    ];
    
    if (statusBadge) {
        statusBadge.textContent = statusTextList[stageNum - 1];
        
        statusBadge.className = "badge";
        if (stageNum === 1 || stageNum === 2) statusBadge.classList.add("badge-neutral");
        else if (stageNum === 3) statusBadge.classList.add("badge-warning");
        else if (stageNum === 4 || stageNum === 6) statusBadge.classList.add("badge-info");
        else if (stageNum === 5) statusBadge.classList.add("badge-warning");
        else if (stageNum === 7) statusBadge.classList.add("badge-success");
    }

    // 4. Show/Hide Document Items
    const docIds = {
        1: ["doc-po-pdf", "doc-foto-kardus", "doc-foto-alat", "doc-video-unboxing"],
        2: ["doc-foto-inspeksi"],
        3: ["doc-penawaran-servis"],
        4: ["doc-wo-kalibrasi"],
        5: ["doc-invoice-pdf"],
        6: ["doc-sertifikat-pdf"],
        7: ["doc-resi-jne"]
    };

    // Hide all first except base stage 1
    for (let s = 2; s <= 7; s++) {
        docIds[s].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
    }

    // Show docs based on current stage progress
    for (let s = 1; s <= stageNum; s++) {
        docIds[s].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "flex";
        });
    }

    // Update dynamic label for Stage 6 document (Sertifikat vs Surat Keterangan)
    const docSertifikat = document.getElementById("doc-sertifikat-pdf");
    if (docSertifikat) {
        const docType = document.getElementById("meta-document-type")?.textContent || "Sertifikat Resmi";
        const titleEl = docSertifikat.querySelector(".doc-info div div");
        if (titleEl) {
            if (docType === "Surat Keterangan") {
                titleEl.textContent = "Surat_Keterangan_Alat_Informal.pdf";
            } else {
                titleEl.textContent = "Sertifikat_Kalibrasi_BRIN_89.pdf";
            }
        }
    }

    // 5. Update Activity Timeline for this tool
    if (supabaseClient && currentToolId) {
        // RILL DATABASE TRIGGER UPDATE & WRITE LOG
        try {
            const statusDetailList = [
                "Admin Menerima Paket & Foto",
                "Pemeriksaan Awal (Teknisi)",
                "Menunggu Persetujuan Servis",
                "Masuk Lab BRIN (WO-89)",
                "Invoice Billing Dikirim",
                "Proses Penerbitan Dokumen",
                "Dalam Pengiriman (Resi JNE)"
            ];

            const operatorNameList = [
                "Rian (Admin)",
                "Agus (Teknisi)",
                "Siti (Admin AUR)",
                "Siti (Admin AUR)",
                "Rian (Finance)",
                "Siti (Admin AUR)",
                "Budi (Logistik)"
            ];
            
            const actionTextList = [
                "menerima paket alat di gudang, melakukan unboxing, mengunggah foto, dan memvalidasi berkas PO Pelanggan.",
                "melakukan inspeksi kelistrikan fisik alat. Sirkuit detektor diperiksa.",
                "membuat surat penawaran biaya perbaikan dan mengirimkannya ke pelanggan.",
                "mengirimkan alat ke fasilitas Laboratorium BRIN untuk pengukuran radiasi.",
                "menerbitkan invoice billing pembayaran perbaikan dan kalibrasi.",
                "menerbitkan dokumen luaran hasil kalibrasi/pemeriksaan alat.",
                "mengemas kembali alat, menempelkan stiker kalibrasi, dan menyerahkan ke kurir JNE."
            ];

            // Update database record
            await supabaseClient
                .from("alats")
                .update({ current_stage: stageNum, status_detail: statusDetailList[stageNum - 1] })
                .eq("id", currentToolId);

            // Log activity only if it doesn't already exist for this stage to avoid duplication
            const { data: logs } = await supabaseClient
                .from("timeline_logs")
                .select("id")
                .eq("alat_id", currentToolId)
                .eq("stage", stageNum);

            if (!logs || logs.length === 0) {
                await supabaseClient
                    .from("timeline_logs")
                    .insert([{
                        alat_id: currentToolId,
                        stage: stageNum,
                        operator_name: user.name, // Log the actual logged in user!
                        action_detail: actionTextList[stageNum - 1]
                    }]);
            }

            // Load logs dynamically from DB
            await loadTimelineFromSupabase(currentToolId);
        } catch (err) {
            console.error("Gagal melakukan sinkronisasi database untuk stage update:", err);
        }
    } else {
        // STATIC FALLBACK
        updateStaticTimeline(stageNum);
    }

    // 6. Automatically load preview of the latest document added in this stage
    const currentDocs = docIds[stageNum];
    const latestDocId = currentDocs[currentDocs.length - 1];
    const docTypeMapping = {
        "doc-po-pdf": "po-pdf",
        "doc-foto-kardus": "foto-kardus",
        "doc-foto-alat": "foto-alat",
        "doc-video-unboxing": "video-unboxing",
        "doc-foto-inspeksi": "foto-inspeksi",
        "doc-penawaran-servis": "penawaran-servis",
        "doc-wo-kalibrasi": "wo-kalibrasi",
        "doc-invoice-pdf": "invoice-pdf",
        "doc-sertifikat-pdf": "sertifikat-pdf",
        "doc-resi-jne": "resi-jne"
    };
    
    loadPreview(docTypeMapping[latestDocId]);
}

// Load real timeline from Supabase database
async function loadTimelineFromSupabase(toolId) {
    const timelineContainer = document.getElementById("detail-timeline-container");
    if (!timelineContainer) return;

    try {
        const { data, error } = await supabaseClient
            .from("timeline_logs")
            .select("*")
            .eq("alat_id", toolId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        let html = "";
        data.forEach(item => {
            const formattedTime = new Date(item.created_at).toLocaleString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            let itemStyle = "info";
            if (item.stage === 1 || item.stage === 7) itemStyle = "success";
            else if (item.stage === 2) itemStyle = "warning";
            else if (item.stage === 5) itemStyle = "warning";

            html += `
                <div class="timeline-feed-item ${itemStyle}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <span class="timeline-user">${item.operator_name}</span> ${item.action_detail}
                    </div>
                    <div class="timeline-time">${formattedTime}</div>
                </div>`;
        });

        timelineContainer.innerHTML = html;
    } catch (err) {
        console.error("Gagal memuat timeline log database:", err);
    }
}

// Load Document Preview
function loadPreview(docType) {
    // 1. Remove active state from all items
    const docItems = document.querySelectorAll(".doc-item");
    docItems.forEach(item => item.classList.remove("active"));
    
    // Find active element
    let targetElId = "";
    if (docType === "po-pdf") targetElId = "doc-po-pdf";
    else if (docType === "foto-kardus") targetElId = "doc-foto-kardus";
    else if (docType === "foto-alat") targetElId = "doc-foto-alat";
    else if (docType === "video-unboxing") targetElId = "doc-video-unboxing";
    else if (docType === "foto-inspeksi") targetElId = "doc-foto-inspeksi";
    else if (docType === "penawaran-servis") targetElId = "doc-penawaran-servis";
    else if (docType === "wo-kalibrasi") targetElId = "doc-wo-kalibrasi";
    else if (docType === "invoice-pdf") targetElId = "doc-invoice-pdf";
    else if (docType === "sertifikat-pdf") targetElId = "doc-sertifikat-pdf";
    else if (docType === "resi-jne") targetElId = "doc-resi-jne";

    const targetEl = document.getElementById(targetElId);
    if (targetEl) targetEl.classList.add("active");

    // 2. Update Canvas Preview
    const canvas = document.getElementById("preview-canvas");
    const previewTitle = document.getElementById("preview-title");
    
    if (!canvas) return;

    let html = "";
    let title = "";

    const instansi = document.getElementById("meta-instansi")?.textContent || "Instansi";
    const poNum = document.getElementById("meta-po-number")?.textContent || "PO-000";
    const serial = document.getElementById("meta-serial")?.textContent || "SN-000";
    const brandModel = document.getElementById("meta-brand-model")?.textContent || "Brand/Model";

    switch(docType) {
        case "po-pdf":
            title = "Preview: PO_Pelanggan.pdf";
            html = `
                <div class="pdf-mockup" style="width:100%;">
                    <div class="pdf-mockup-header">
                        <h2 style="font-size: 1.1rem; color: var(--primary); font-weight: 700;">${instansi}</h2>
                        <p style="font-size: 0.7rem; color: var(--text-secondary);">Kantor Operasional | Verifikasi PO</p>
                    </div>
                    <div class="pdf-mockup-body">
                        <h3 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">PURCHASE ORDER (PO)</h3>
                        <p><strong>No. PO:</strong> ${poNum}</p>
                        <p><strong>Tanggal Masuk:</strong> 12 Juli 2026</p>
                        <p style="margin-top: 14px;"><strong>Deskripsi Pekerjaan:</strong> Jasa Servis & Kalibrasi Alat Ukur Radiasi (AUR)</p>
                        <table style="width:100%; border-collapse: collapse; margin-top: 14px; font-size:0.7rem;">
                            <thead>
                                <tr style="border-bottom:1px solid #000; border-top:1px solid #000;">
                                    <th style="padding:4px 0; text-align:left;">Item Deskripsi</th>
                                    <th style="padding:4px 0; text-align:center;">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding:4px 0;">Kalibrasi & Servis Alat ${brandModel} (SN: ${serial})</td>
                                    <td style="padding:4px 0; text-align:center;">1 Unit</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 0.65rem; text-align: center; color: var(--text-muted);">
                        Dokumen Pertama Diunggah oleh Admin Logistik
                    </div>
                </div>`;
            break;
            
        case "foto-kardus":
            title = "Preview: Foto Kardus Penerimaan (Telegram)";
            const kardusLink = document.getElementById("meta-foto-kardus-link")?.textContent || "https://t.me/c/12345/67";
            html = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; gap:16px; padding: 24px; text-align: center;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background-color: rgba(34, 158, 217, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <i data-lucide="send" style="width:40px; height:40px; color:#229ED9; transform: rotate(-15deg); margin-right: 4px; margin-top: -2px;"></i>
                    </div>
                    <h4 style="font-weight: 700; color: var(--primary); font-size: 1rem;">Foto Kardus di Telegram</h4>
                    <p style="font-size:0.8rem; color:var(--text-secondary); max-width: 320px;">Foto kardus penerimaan paket diunggah langsung ke Telegram oleh bagian logistik.</p>
                    <div style="font-size: 0.75rem; color: var(--text-muted); background: var(--bg-page); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); width: 100%; word-break: break-all; font-family: monospace;">
                        ${kardusLink}
                    </div>
                    <a href="${kardusLink}" target="_blank" class="btn btn-accent" style="background-color: #229ED9; border-color: #229ED9; width: 100%; justify-content: center; box-shadow: 0 4px 12px rgba(34, 158, 217, 0.2); text-decoration: none;">
                        <i data-lucide="external-link"></i> Buka Foto di Telegram
                    </a>
                </div>`;
            break;
            
        case "foto-alat":
            title = "Preview: Foto Alat Penerimaan (Telegram)";
            const fotoAlatLink = document.getElementById("meta-foto-alat-link")?.textContent || "https://t.me/c/12345/68";
            html = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; gap:16px; padding: 24px; text-align: center;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background-color: rgba(34, 158, 217, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <i data-lucide="send" style="width:40px; height:40px; color:#229ED9; transform: rotate(-15deg); margin-right: 4px; margin-top: -2px;"></i>
                    </div>
                    <h4 style="font-weight: 700; color: var(--primary); font-size: 1rem;">Foto Kondisi Alat di Telegram</h4>
                    <p style="font-size:0.8rem; color:var(--text-secondary); max-width: 320px;">Foto kondisi fisik alat saat unboxing disimpan di channel Telegram untuk pelacakan aset.</p>
                    <div style="font-size: 0.75rem; color: var(--text-muted); background: var(--bg-page); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); width: 100%; word-break: break-all; font-family: monospace;">
                        ${fotoAlatLink}
                    </div>
                    <a href="${fotoAlatLink}" target="_blank" class="btn btn-accent" style="background-color: #229ED9; border-color: #229ED9; width: 100%; justify-content: center; box-shadow: 0 4px 12px rgba(34, 158, 217, 0.2); text-decoration: none;">
                        <i data-lucide="external-link"></i> Buka Foto di Telegram
                    </a>
                </div>`;
            break;
            
        case "video-unboxing":
            title = "Preview: Video Unboxing Paket (Telegram)";
            const videoLink = document.getElementById("meta-video-unboxing-link")?.textContent || "https://t.me/c/12345/69";
            html = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; gap:16px; padding: 24px; text-align: center;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background-color: rgba(34, 158, 217, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <i data-lucide="send" style="width:40px; height:40px; color:#229ED9; transform: rotate(-15deg); margin-right: 4px; margin-top: -2px;"></i>
                    </div>
                    <h4 style="font-weight: 700; color: var(--primary); font-size: 1rem;">Video Unboxing di Telegram</h4>
                    <p style="font-size:0.8rem; color:var(--text-secondary); max-width: 320px;">Video unboxing penuh berdurasi lengkap disimpan di Telegram secara awan & gratis.</p>
                    <div style="font-size: 0.75rem; color: var(--text-muted); background: var(--bg-page); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); width: 100%; word-break: break-all; font-family: monospace;">
                        ${videoLink}
                    </div>
                    <a href="${videoLink}" target="_blank" class="btn btn-accent" style="background-color: #229ED9; border-color: #229ED9; width: 100%; justify-content: center; box-shadow: 0 4px 12px rgba(34, 158, 217, 0.2); text-decoration: none;">
                        <i data-lucide="external-link"></i> Buka Video di Telegram
                    </a>
                </div>`;
            break;
            
        case "foto-inspeksi":
            title = "Preview: Foto_Kerusakan_Sensor.jpg";
            html = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; gap:12px;">
                    <div class="photo-mockup" style="width:100%; max-width:400px; height:240px; border:1px solid var(--border); background-color:#FCA5A5;">
                        <i data-lucide="shield-alert" style="width:64px; height:64px; color:#EF4444;"></i>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-secondary); font-weight:600; color:var(--danger);">Ditemukan: Kerusakan pada bagian kelistrikan sensor detektor</p>
                </div>`;
            break;
            
        case "penawaran-servis":
            title = "Preview: Penawaran_Biaya_Servis.pdf";
            html = `
                <div class="pdf-mockup" style="width:100%;">
                    <div class="pdf-mockup-header" style="border-color: var(--accent);">
                        <h2 style="font-size: 1.1rem; color: var(--primary); font-weight: 700;">CV Cahaya Nuklida Persada</h2>
                        <p style="font-size: 0.7rem; color: var(--text-secondary);">Layanan Servis & Kalibrasi AUR | Penawaran Biaya</p>
                    </div>
                    <div class="pdf-mockup-body">
                        <h3 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; color: var(--accent);">SURAT PENAWARAN PERBAIKAN</h3>
                        <p><strong>Kepada:</strong> ${instansi}</p>
                        <p><strong>Berdasarkan PO:</strong> ${poNum}</p>
                        <p style="margin-top: 14px;"><strong>Rincian Kerusakan & Suku Cadang:</strong></p>
                        <table style="width:100%; border-collapse: collapse; margin-top: 8px; font-size:0.7rem;">
                            <thead>
                                <tr style="border-bottom:1px solid #000; border-top:1px solid #000;">
                                    <th style="padding:4px 0; text-align:left;">Suku Cadang / Jasa</th>
                                    <th style="padding:4px 0; text-align:right;">Biaya</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding:4px 0;">Penggantian Kapasitor Detektor Ion Chamber</td>
                                    <td style="padding:4px 0; text-align:right;">Rp 1.200.000</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0;">Jasa Kalibrasi & Penyetelan Ulang</td>
                                    <td style="padding:4px 0; text-align:right;">Rp 800.000</td>
                                </tr>
                                <tr style="border-top:1px solid #CCC; font-weight:700;">
                                    <td style="padding:4px 0;">Total Estimasi</td>
                                    <td style="padding:4px 0; text-align:right;">Rp 2.000.000</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 0.65rem; text-align: center; color: var(--text-muted);">
                        Status: Menunggu Persetujuan Customer (WhatsApp / Email)
                    </div>
                </div>`;
            break;
            
        case "wo-kalibrasi":
            title = "Preview: Work_Order_BRIN_89.pdf";
            html = `
                <div class="pdf-mockup" style="width:100%;">
                    <div class="pdf-mockup-header" style="border-color: var(--info);">
                        <h2 style="font-size: 1.1rem; color: var(--primary); font-weight: 700;">BRIN - Laboratorium Kalibrasi</h2>
                        <p style="font-size: 0.7rem; color: var(--text-secondary);">Badan Riset dan Inovasi Nasional | Jakarta</p>
                    </div>
                    <div class="pdf-mockup-body">
                        <h3 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">WORK ORDER KALIBRASI (WO)</h3>
                        <p><strong>Nomor WO:</strong> BRIN-WO-2026-089</p>
                        <p><strong>Nama Pemilik Alat:</strong> CV Cahaya Nuklida Persada (a.n. ${instansi})</p>
                        <p style="margin-top: 12px;"><strong>Spesifikasi Alat Kalibrasi:</strong></p>
                        <ul style="font-size: 0.7rem; padding-left: 16px; margin-top: 6px;">
                            <li>Nama Alat: ${brandModel}</li>
                            <li>No. Seri: ${serial}</li>
                            <li>Status Uji: Sedang dalam Proses Pengukuran Radiasi</li>
                        </ul>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 0.65rem; text-align: center; color: var(--text-muted);">
                        Alat Terdaftar & Diterima di Lab Kalibrasi BRIN
                    </div>
                </div>`;
            break;
            
        case "invoice-pdf":
            title = "Preview: Invoice_Billing_COS89.pdf";
            html = `
                <div class="pdf-mockup" style="width:100%;">
                    <div class="pdf-mockup-header" style="border-color: var(--warning);">
                        <h2 style="font-size: 1.1rem; color: var(--primary); font-weight: 700;">CV Cahaya Nuklida Persada</h2>
                        <p style="font-size: 0.7rem; color: var(--text-secondary);">Finance Division | Invoice Penagihan</p>
                    </div>
                    <div class="pdf-mockup-body">
                        <h3 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; color: var(--warning);">INVOICE TAGIHAN</h3>
                        <p><strong>Nomor Invoice:</strong> INV/CNP/2026/07-089</p>
                        <p><strong>Ditujukan Kepada:</strong> ${instansi}</p>
                        <p style="margin-top: 14px;"><strong>Pekerjaan Kalibrasi & Servis Selesai:</strong></p>
                        <table style="width:100%; border-collapse: collapse; margin-top: 8px; font-size:0.7rem;">
                            <thead>
                                <tr style="border-bottom:1px solid #000; border-top:1px solid #000;">
                                    <th style="padding:4px 0; text-align:left;">Item Layanan</th>
                                    <th style="padding:4px 0; text-align:right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding:4px 0;">Jasa Servis Alat ${brandModel}</td>
                                    <td style="padding:4px 0; text-align:right;">Rp 1.200.000</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0;">Sertifikasi Kalibrasi Koperasi Nuklindo / BRIN</td>
                                    <td style="padding:4px 0; text-align:right;">Rp 800.000</td>
                                </tr>
                                <tr style="border-top:1px solid #CCC; font-weight:700;">
                                    <td style="padding:4px 0;">Total Tagihan (DP 0%)</td>
                                    <td style="padding:4px 0; text-align:right;">Rp 2.000.000</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 0.65rem; text-align: center; color: var(--success); font-weight: 700;">
                        [LUNAS] Pembayaran diverifikasi Finance via Bank Mandiri
                    </div>
                </div>`;
            break;
            
        case "sertifikat-pdf":
            const docTypeVal = document.getElementById("meta-document-type")?.textContent || "Sertifikat Resmi";
            if (docTypeVal === "Surat Keterangan") {
                title = "Preview: Surat_Keterangan_Alat_Informal.pdf";
                html = `
                    <div class="pdf-mockup" style="width:100%; border-color: var(--secondary);">
                        <div class="pdf-mockup-header" style="text-align: center; border-color: var(--secondary);">
                            <h2 style="font-size: 1.1rem; color: var(--primary); font-weight: 700;">SURAT KETERANGAN KONDISI ALAT</h2>
                            <p style="font-size: 0.7rem; color: var(--text-secondary);">Nomor Ket: CNP-2026-SK-08992</p>
                        </div>
                        <div class="pdf-mockup-body" style="margin-top: 10px;">
                            <p>Menerangkan bahwa alat berikut telah dilakukan penyetelan/inspeksi operasional:</p>
                            <table style="width:100%; margin: 10px 0; font-size: 0.7rem; border-collapse: collapse;">
                                <tr><td><strong>Nama Alat:</strong></td><td>${brandModel}</td></tr>
                                <tr><td><strong>No. Seri:</strong></td><td>${serial}</td></tr>
                                <tr><td><strong>Pemilik:</strong></td><td>${instansi}</td></tr>
                            </table>
                            <p style="font-size: 0.7rem; margin-top: 8px;">Kondisi fisik dan fungsional alat saat diserahkan dinyatakan: <strong>DAPAT BEROPERASI</strong>.</p>
                            
                            <!-- BOX DISCLAIMER BEBAS TUNTUTAN HUKUM -->
                            <div style="margin-top: 16px; border: 1.5px dashed var(--danger); padding: 10px; border-radius: var(--radius-sm); background-color: rgba(239, 68, 68, 0.05); font-size: 0.65rem; color: #7F1D1D; text-align: left;">
                                <strong style="color: var(--danger); text-transform: uppercase; display: block; margin-bottom: 4px;"><i data-lucide="shield-alert" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> PERNYATAAN BEBAS TUNTUTAN HUKUM (DISCLAIMER):</strong>
                                Surat Keterangan ini bersifat informal / internal dan <strong>BUKAN</strong> merupakan Sertifikat Kalibrasi Resmi yang diterbitkan oleh badan penguji terakreditasi (seperti KAN/BRIN). Dokumen ini murni sebagai catatan kondisi fisik alat saat selesai diperiksa. Penerbit (CV Cahaya Nuklida Persada) dan pihak terkait lainnya tidak dapat dituntut, disalahkan, atau dimintai pertanggungjawaban hukum atas segala kerugian yang timbul dari akurasi atau penggunaan dokumen ini di kemudian hari.
                            </div>
                        </div>
                        <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 0.65rem; text-align: center; color: var(--text-muted); margin-top: 10px;">
                            Tanda Tangan Internal Operator (Informal)
                        </div>
                    </div>`;
            } else {
                title = "Preview: Sertifikat_Kalibrasi_BRIN_89.pdf";
                html = `
                    <div class="pdf-mockup" style="width:100%;">
                        <div class="pdf-mockup-header" style="border-color: var(--success); text-align: center;">
                            <h2 style="font-size: 1.1rem; color: var(--primary); font-weight: 700;">SERTIFIKAT KALIBRASI</h2>
                            <p style="font-size: 0.7rem; color: var(--text-secondary);">Certificate No: CNP-2026-CAL-08992</p>
                        </div>
                        <div class="pdf-mockup-body" style="text-align: center; margin-top: 16px;">
                            <p>Menyatakan bahwa alat ukur radiasi:</p>
                            <h3 style="font-size: 1rem; font-weight: 700; margin: 8px 0; color:var(--primary);">${brandModel}</h3>
                            <p>Nomor Seri: <strong>${serial}</strong></p>
                            <p>Pemilik: <strong>${instansi}</strong></p>
                            <p style="margin-top: 14px; font-size:0.7rem; color:var(--text-secondary);">Telah dikalibrasi di fasilitas Laboratorium dengan hasil sesuai standar keselamatan radiasi nasional.</p>
                            <div style="display:flex; justify-content:space-around; margin-top:20px; font-size:0.65rem;">
                                <div>
                                    <p>Tanggal Kalibrasi</p>
                                    <strong>15 Juli 2026</strong>
                                </div>
                                <div>
                                    <p>Kalibrasi Berikutnya</p>
                                    <strong>15 Juli 2027</strong>
                                </div>
                            </div>
                        </div>
                        <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 0.65rem; text-align: center; color: var(--text-muted);">
                            Ditandatangani Secara Elektronik oleh Kepala Lab Kalibrasi
                        </div>
                    </div>`;
            }
            break;
            
        case "resi-jne":
            title = "Preview: Resi_JNE_Pengiriman.pdf";
            html = `
                <div class="pdf-mockup" style="width:100%;">
                    <div class="pdf-mockup-header" style="border-color: #EF4444;">
                        <h2 style="font-size: 1.1rem; color: #EF4444; font-weight: 800;">JNE Express</h2>
                        <p style="font-size: 0.7rem; color: var(--text-secondary);">Bukti Pengiriman Barang (Resi Resmi)</p>
                    </div>
                    <div class="pdf-mockup-body">
                        <p><strong>No. Resi JNE:</strong> JNE-882710028912</p>
                        <p><strong>Pengirim:</strong> CV Cahaya Nuklida Persada (Jakarta)</p>
                        <p><strong>Penerima:</strong> ${instansi} (${document.getElementById("meta-plant")?.textContent || "Plant"})</p>
                        <p style="margin-top: 14px;"><strong>Deskripsi Paket:</strong> Box Alat Ukur Radiasi ${brandModel} (Sensitif/Pecah Belah)</p>
                        <div style="margin-top: 16px; border: 1px solid var(--border); padding: 8px; border-radius:4px; font-size:0.65rem; background-color:var(--bg-page);">
                            <strong>Status Pengiriman:</strong> Kurir menerima paket di JNE Hub Jakarta Pusat.
                        </div>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 8px; font-size: 0.65rem; text-align: center; color: var(--text-muted);">
                        Selesai - Pekerjaan Ditutup dengan Sukses
                    </div>
                </div>`;
            break;
    }

    if (previewTitle) previewTitle.textContent = title;
    if (canvas) canvas.innerHTML = html;
    
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

// Update Timeline dynamically (Static Fallback Mode)
function updateStaticTimeline(stageNum) {
    const timelineContainer = document.getElementById("detail-timeline-container");
    if (!timelineContainer) return;
    
    // Gunakan helper async secara tidak langsung melalui status statis
    const mockSession = JSON.parse(localStorage.getItem("mock_session") || "{}");
    const activeUserName = mockSession.user_metadata?.full_name || "Rian (Admin)";

    const timelineData = [
        { stage: 1, user: activeUserName, action: "menerima paket alat di gudang, melakukan unboxing, mengunggah foto, dan memvalidasi berkas PO Pelanggan.", time: "12 Juli 2026, 09:10", style: "success" },
        { stage: 2, user: activeUserName, action: "melakukan inspeksi kelistrikan fisik alat. Ditemukan kerusakan sirkuit pada sensor detektor.", time: "12 Juli 2026, 14:30", style: "warning" },
        { stage: 3, user: activeUserName, action: "membuat surat penawaran biaya servis penggantian suku cadang sebesar Rp 2.000.000 dan mengirimkan ke WhatsApp pelanggan.", time: "13 Juli 2026, 10:15", style: "info" },
        { stage: 3, user: "Sistem (Customer)", action: "menyetujui penawaran biaya servis yang dikirimkan via tautan WhatsApp.", time: "13 Juli 2026, 15:00", style: "success" },
        { stage: 4, user: activeUserName, action: "menyelesaikan servis perbaikan suku cadang sensor dan mendaftarkan alat untuk pengujian kalibrasi.", time: "14 Juli 2026, 09:30", style: "info" },
        { stage: 4, user: activeUserName, action: "mengirimkan alat ke fasilitas Laboratorium BRIN dan mengunggah dokumen Work Order Kalibrasi.", time: "14 Juli 2026, 11:15", style: "info" },
        { stage: 5, user: activeUserName, action: "menerbitkan invoice billing pembayaran perbaikan dan kalibrasi alat.", time: "15 Juli 2026, 10:00", style: "warning" },
        { stage: 5, user: activeUserName, action: "memvalidasi transfer bank lunas dari pelanggan dan mengonfirmasi pelunasan tagihan billing.", time: "15 Juli 2026, 14:45", style: "success" },
        { stage: 6, user: activeUserName, action: "menerima dokumen Sertifikat Kalibrasi resmi dari BRIN dan mengunggah salinan digitalnya ke sistem.", time: "16 Juli 2026, 11:30", style: "success" },
        { stage: 7, user: activeUserName, action: "mengemas kembali alat, menempelkan stiker kalibrasi, menyerahkan ke JNE, dan mengunggah nomor resi pengiriman.", time: "17 Juli 2026, 15:30", style: "success" }
    ];

    let html = "";
    timelineData.forEach(item => {
        if (item.stage <= stageNum) {
            html = `
                <div class="timeline-feed-item ${item.style}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <span class="timeline-user">${item.user}</span> ${item.action}
                    </div>
                    <div class="timeline-time">${item.time}</div>
                </div>` + html;
        }
    });

    timelineContainer.innerHTML = html;
}

// ==========================================
// SIDEBAR WIDGETS: RECENT ACTIVITIES & DEADLINES (REAL-TIME)
// ==========================================
function getFriendlyTimeDifference(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    
    if (diffSec < 60) return "Baru saja";
    if (diffMin < 60) return `${diffMin} Menit Lalu`;
    if (diffHr < 24) return `${diffHr} Jam Lalu`;
    if (diffDay === 1) return "Kemarin";
    return `${diffDay} Hari Lalu`;
}

async function loadRecentOperationalActivities() {
    const container = document.getElementById("recent-activities-container");
    if (!container) return;
    
    let logs = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from("timeline_logs")
                .select("*, alats(serial_number, merk, tipe, pos(po_number))")
                .order("created_at", { ascending: false })
                .limit(5);
            if (error) throw error;
            logs = data || [];
        } catch (e) {
            console.error("Gagal load recent activities:", e);
        }
    }
    
    if (logs.length > 0) {
        let html = "";
        logs.forEach(item => {
            const timeDiffStr = getFriendlyTimeDifference(item.created_at);
            const poNum = item.alats && item.alats.pos ? item.alats.pos.po_number : "N/A";
            const operator = item.operator_name || "Staf";
            
            let styleClass = "info";
            if (item.stage === 1 || item.stage === 7) styleClass = "success";
            else if (item.stage === 2 || item.stage === 5) styleClass = "warning";
            
            html += `
                <div class="timeline-feed-item ${styleClass}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <span class="timeline-user">${operator}</span> ${item.action_detail} <span class="badge badge-neutral" style="font-size:0.6rem; padding: 2px 4px; margin-left: 2px;">PO: ${poNum}</span>
                    </div>
                    <div class="timeline-time">${timeDiffStr}</div>
                </div>`;
        });
        container.innerHTML = html;
    }
}

async function loadApproachingDeadlines() {
    const container = document.getElementById("deadlines-container");
    if (!container) return;
    
    let deadlineAlats = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from("alats")
                .select("*, pos(*)")
                .neq("current_stage", 7) // Only active jobs
                .order("created_at", { ascending: false })
                .limit(3);
            if (error) throw error;
            
            deadlineAlats = (data || []).sort((a, b) => {
                const dateA = new Date(a.pos.estimasi_selesai || 0);
                const dateB = new Date(b.pos.estimasi_selesai || 0);
                return dateA - dateB;
            });
        } catch (e) {
            console.error("Gagal load deadlines:", e);
        }
    }
    
    if (deadlineAlats.length > 0) {
        let html = "";
        const now = new Date();
        now.setHours(0,0,0,0);
        
        deadlineAlats.forEach(item => {
            const estimasiStr = item.pos.estimasi_selesai;
            let diffDaysText = "N/A";
            let borderStyle = "var(--info)";
            let badgeClass = "badge-info";
            
            if (estimasiStr) {
                const estDate = new Date(estimasiStr);
                estDate.setHours(0,0,0,0);
                const diffTime = estDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    diffDaysText = `Terlambat ${Math.abs(diffDays)} Hari`;
                    borderStyle = "var(--danger)";
                    badgeClass = "badge-danger";
                } else if (diffDays === 0) {
                    diffDaysText = "Hari Ini";
                    borderStyle = "var(--warning)";
                    badgeClass = "badge-warning";
                } else {
                    diffDaysText = `${diffDays} Hari Lagi`;
                    if (diffDays <= 3) {
                        borderStyle = "var(--danger)";
                        badgeClass = "badge-danger";
                    } else {
                        borderStyle = "var(--warning)";
                        badgeClass = "badge-warning";
                    }
                }
            }
            
            const statusTextList = [
                "Penerimaan",
                "Pemeriksaan Awal",
                "Servis Alat",
                "Kalibrasi Lab",
                "Billing Pembayaran",
                "Penerbitan Dokumen",
                "Pengiriman"
            ];
            
            const currentStageText = statusTextList[item.current_stage - 1] || "Proses";
            
            html += `
                <div style="border-left: 3px solid ${borderStyle}; padding-left: 12px; margin-bottom: 14px;">
                    <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--primary);">${item.merk} ${item.tipe} (SN: ${item.serial_number})</h4>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">${item.pos.po_number} - Estimasi: ${diffDaysText}</p>
                    <span class="badge ${badgeClass}" style="font-size: 0.65rem; margin-top: 4px;">Tahap ${item.current_stage}: ${currentStageText}</span>
                </div>`;
        });
        container.innerHTML = html;
    }
}
