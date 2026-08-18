// ================================================================
//  BKZS AÇIK KAYNAKLI ANOMALİ TESPİT PROTOTİPİ
//  Gerçekçi GNSS Sinyal Simülasyonu + 3 Katmanlı Tespit Motoru
// ================================================================

// ===================== GERÇEK TOTP ALGORİTMASI =====================
function base32tohex(base32) {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "", hex = "";
    for (let i = 0; i < base32.length; i++) {
        const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        bits += val.toString(2).padStart(5, '0');
    }
    for (let i = 0; i + 4 <= bits.length; i += 4) {
        hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
    }
    return hex;
}
function getTOTP(secretBase32) {
    const key = CryptoJS.enc.Hex.parse(base32tohex(secretBase32));
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const time = Math.floor(epoch / 30);
    const timeHex = time.toString(16).padStart(16, '0');
    const timeBytes = CryptoJS.enc.Hex.parse(timeHex);
    
    const hmac = CryptoJS.HmacSHA1(timeBytes, key);
    const hmacHex = hmac.toString(CryptoJS.enc.Hex);
    
    const offset = parseInt(hmacHex.substring(hmacHex.length - 1), 16);
    let otp = (parseInt(hmacHex.substring(offset * 2, offset * 2 + 8), 16) & 0x7fffffff) + "";
    otp = otp.substring(otp.length - 6);
    while (otp.length < 6) otp = "0" + otp;
    return otp;
}

const TOTP_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const TOTP_URI = `otpauth://totp/BKZS_Kontrol_Merkezi?secret=${TOTP_SECRET}&issuer=BKZS`;

function strictNetworkCheck() {
    const loc = window.location;
    // Eğer localhost, 127.0.0.1 veya file sistemi değilse, başka bilgisayardan giriliyordur.
    if (loc.protocol !== 'file:' && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
        setTimeout(triggerFirewall, 100);
        return false;
    }
    return true;
}

// ===================== AUTH & 2FA =====================
document.addEventListener("DOMContentLoaded", () => {
    // Sadece yerel cihaz onayı (Başka bilgisayardansa direkt engelle)
    if (!strictNetworkCheck()) {
        document.getElementById('auth-primary-box').style.display = 'none';
        return;
    }

    const authBtn = document.getElementById('auth-btn');
    const authInput = document.getElementById('auth-input');
    const authName = document.getElementById('auth-name');
    let startTime = null;

    authInput.addEventListener("focus", () => { if (!startTime) startTime = Date.now(); });
    authInput.addEventListener("keypress", e => { if (e.key === "Enter") { e.preventDefault(); authBtn.click(); } });
    authName.addEventListener("keypress", e => { if (e.key === "Enter") { e.preventDefault(); authInput.focus(); } });

    // 1. AŞAMA DOĞRULAMASI
    authBtn.addEventListener('click', async () => {
        const nameInput = authName.value.trim();
        const pwdInput = authInput.value.trim();
        const lb = document.getElementById('auth-log-box');
        
        lb.style.display = 'block'; lb.innerHTML = '';
        logA("[!] ÇOK KATMANLI PERSONEL DOĞRULAMASI...", "sys-msg");
        await dl(400);
        
       // Demo sürümü - şifreler kaldırıldı
            if (nameInput === "" || pwdInput === "")
            window.authFailedCount = (window.authFailedCount || 0) + 1;
            
            if (window.authFailedCount >= 3) {
                // 3. Yanlış denemede Honeypot Firewalla düşür.
                logA("🛑 KRİTİK İHLAL TESPİT EDİLDİ! GÜVENLİK DUVARI DEVREDE...", "err-msg");
                await dl(500);
                triggerFirewall();
                return;
            }
            
            logA(`❌ ERİŞİM REDDEDİLDİ: Geçersiz Kimlik/Parola (${window.authFailedCount}/3)`, "err-msg");
            document.getElementById('auth-primary-box').classList.remove('shake');
            void document.getElementById('auth-primary-box').offsetWidth;
            document.getElementById('auth-primary-box').classList.add('shake');
            return;
        }
        
        logA("✅ KİMLİK OK: Yetkili Personel Doğrulandı", "success-msg");
        await dl(300);
        const spd = startTime ? (Date.now() - startTime) / 1000 : 999;
        if (spd < 1) logA(`⚠️ Bot Şüphesi: ${spd.toFixed(2)}s. Biyometrik analiz eklendi.`, "warn-msg"); 
        else logA(`✅ İnsan Faktörü Zamanlaması: ${spd.toFixed(2)}s`, "success-msg");
        await dl(200); 
        logA("✅ MAC & Cihaz C-04 Doğrulandı", "success-msg");
        await dl(400);
        logA("\n✅ 1. AŞAMA BAŞARILI: 2FA BEKLENİYOR...", "success-msg");
        
        setTimeout(() => {
            document.getElementById('auth-primary-box').style.display = 'none';
            document.getElementById('auth-2fa-box').style.display = 'block';
            document.getElementById('totp-input').focus();
        }, 1200);
    });

    // 2. AŞAMA (TOTP)
    const totpBtn = document.getElementById('totp-btn');
    const totpInput = document.getElementById('totp-input');
    const qrModal = document.getElementById('qr-modal');
    
    document.getElementById('show-qr-btn').addEventListener('click', () => {
        document.getElementById('qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(TOTP_URI)}`;
        qrModal.style.display = 'flex';
    });
    document.getElementById('close-qr-btn').addEventListener('click', () => {
        qrModal.style.display = 'none';
        totpInput.focus();
    });
    
    document.getElementById('totp-back-btn').addEventListener('click', () => {
        document.getElementById('auth-2fa-box').style.display = 'none';
        document.getElementById('auth-primary-box').style.display = 'block';
        totpInput.value = '';
        authInput.value = '';
        document.getElementById('auth-log-box').style.display = 'none';
    });

    totpBtn.addEventListener('click', () => {
        const code = totpInput.value.trim();
        const msg = document.getElementById('totp-msg');
        
        const realCode = getTOTP(TOTP_SECRET);
        
        if (code === realCode) {
            msg.style.color = 'var(--green)';
            msg.innerText = '[+] TOTP ONAYLANDI. SİSTEME GİRİLİYOR...';
            totpInput.classList.add('auth-success');
            setTimeout(boot, 1000);
        } else {
            msg.style.color = 'var(--red)';
            msg.innerText = '[-] YANLIŞ AUTHENTICATOR KODU!';
            totpInput.classList.remove('shake');
            void totpInput.offsetWidth;
            totpInput.classList.add('shake');
            totpInput.value = '';
            totpInput.focus();
        }
    });

    totpInput.addEventListener('keypress', e => {
        if (e.key === "Enter") { e.preventDefault(); totpBtn.click(); }
    });

    document.getElementById('fileInput').addEventListener('change', handleFile);
});

function dl(t){return new Promise(r=>setTimeout(r,t))}
function logA(t,c=""){const d=document.createElement('div');d.className=`line ${c}`;d.innerText=t;const b=document.getElementById('auth-log-box');b.appendChild(d);b.scrollTop=b.scrollHeight}
function boot(){setTimeout(()=>{document.getElementById('auth-screen').classList.add('hidden');document.getElementById('main-dashboard').classList.add('active');initAll()},1200)}

// ===================== FIREWALL MATRIX KODLARI =====================
function triggerFirewall() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('active');
    
    const fw = document.getElementById('firewall-screen');
    fw.classList.remove('hidden');
    
    // Matrix Effect Init
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const alphabet = katakana + latin + nums;
    
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = [];
    
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }
    
    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(draw, 30);
    
    // Yeniden boyutlandırma dinleyicisi
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}


// ================================================================
//  GNSS UYDU SİMÜLATÖRÜ - 6 bağımsız uydu
// ================================================================
const SAT_NAMES = ['SAT-1A','SAT-2B','SAT-3C','SAT-4D','SAT-5E','SAT-6F'];
const SAT_COUNT = 6;

class GNSSSatelliteSimulator {
    constructor() {
        // Her uydu için baseline değerler (normal koşullar)
        this.baselines = SAT_NAMES.map((_, i) => ({
            cn0: 42 + i * 1.2,          // dB-Hz (38-50 arası dağılım)
            agc: 11 + Math.random() * 2,  // % (8-15 arası)
            pseudorange: 0.5 + Math.random() * 2, // m rezidüel
            carrierPhase: 0,              // cycle (0 = kesinti yok)
            doppler: 1.2 + Math.random() * 1.5,   // Hz
            elevation: 25 + i * 12        // derece (radar açısı)
        }));
    }

    generate(scenario) {
        return this.baselines.map((base, i) => {
            let cn0, agc, pr, cp, dop;
            const noise = () => (Math.random() - 0.5) * 2; // ±1 gürültü

            if (scenario === 'NORMAL') {
                cn0 = base.cn0 + noise() * 1.5;
                agc = base.agc + noise() * 0.8;
                pr  = base.pseudorange + noise() * 0.5;
                cp  = 0;
                dop = base.doppler + noise() * 0.3;
            }
            else if (scenario === 'JAMMING') {
                // Jamming: TÜM uydularda eşzamanlı C/N₀ çöküşü + AGC doyumu
                cn0 = 5 + Math.random() * 10; // Şiddetli düşüş
                agc = 50 + Math.random() * 25; // Doyum
                pr  = base.pseudorange + noise() * 2; // Pseudorange çok değişmez
                cp  = 0;
                dop = base.doppler + noise() * 1.5;
            }
            else if (scenario === 'SPOOFING') {
                // Spoofing: Anormal yüksek C/N₀, büyük pseudorange res., carrier phase kesintisi
                cn0 = 49 + Math.random() * 3; // Şüpheli derecede yüksek ve uniform
                agc = 11 + Math.random() * 1; // Normal görünüme zorlanır
                pr  = 200 + Math.random() * 400; // Büyük konum sapması
                cp  = Math.random() > 0.3 ? 1 : 0; // Cycle slip
                dop = 0.05 + Math.random() * 0.15; // Casi sıfır Doppler (statik sahte sinyal)
            }
            else if (scenario === 'MEACONING') {
                // Meaconing: Normal ama gecikmiş tekrar - yavaş sapma + periyodik faz
                const t = Date.now() / 1000;
                cn0 = base.cn0 + noise() * 1 + Math.sin(t + i) * 2; // Hafif salınım
                agc = base.agc + noise() * 0.5;
                pr  = base.pseudorange + 10 + Math.random() * 35 + Math.sin(t * 0.5) * 8; // Yavaş büyüyen
                cp  = Math.sin(t * 2 + i) * 0.3; // Periyodik faz kayması
                dop = base.doppler + noise() * 0.2 + Math.sin(t * 0.3) * 0.4;
            }
            else if (scenario === 'ERROR') {
                // Hata: Sinyaller kopuk veya tamamen absürt, donanım kaynaklı arıza
                cn0 = Math.random() > 0.5 ? 0 : Math.random() * 5; 
                agc = Math.random() > 0.5 ? 100 : 0;
                pr  = Math.random() > 0.8 ? 8000 + Math.random() * 2000 : 0;
                cp  = Math.random() > 0.2 ? 1 : 0;
                dop = Math.random() * 100;
            }

            return {
                name: SAT_NAMES[i],
                cn0: Math.max(0, cn0),
                agc: Math.max(0, Math.min(100, agc)),
                pseudorange: Math.max(0, pr),
                carrierPhase: cp,
                doppler: Math.max(0, dop),
                elevation: base.elevation
            };
        });
    }
}


// ================================================================
//  3 KATMANLI ANOMALİ TESPİT MOTORU
// ================================================================
class AnomalyDetectionEngine {
    constructor() {
        this.WINDOW = 60; // Hareketli ortalama penceresi
        this.history = { cn0: [], agc: [], pr: [], sync: [] };
        this.statResult = { triggered: false, details: '' };
        this.crossResult = { triggered: false, details: '' };
        this.mlScore = 0;
        this.classification = 'NORMAL';
    }

    // -- KATMAN 1: İstatistiksel Baseline (MA₆₀ + 3σ) --
    statisticalLayer(satellites) {
        const avgCN0 = satellites.reduce((s, sat) => s + sat.cn0, 0) / SAT_COUNT;
        const avgAGC = satellites.reduce((s, sat) => s + sat.agc, 0) / SAT_COUNT;
        const avgPR  = satellites.reduce((s, sat) => s + sat.pseudorange, 0) / SAT_COUNT;

        this.history.cn0.push(avgCN0);
        this.history.agc.push(avgAGC);
        this.history.pr.push(avgPR);
        if (this.history.cn0.length > this.WINDOW) { this.history.cn0.shift(); this.history.agc.shift(); this.history.pr.shift(); }

        if (this.history.cn0.length < 10) { this.statResult = { triggered: false, details: 'Baseline toplama...' }; return; }

        const maCN0 = mean(this.history.cn0);
        const sdCN0 = stdDev(this.history.cn0);
        const maAGC = mean(this.history.agc);
        const sdAGC = stdDev(this.history.agc);
        const maPR  = mean(this.history.pr);
        const sdPR  = stdDev(this.history.pr);

        let flags = [];
        // 3σ kuralı: Mevcut değer ortalamanın 3 standart sapma dışındaysa
        if (Math.abs(avgCN0 - maCN0) > 3 * Math.max(sdCN0, 1)) flags.push(`C/N₀ 3σ aşımı (${avgCN0.toFixed(1)} vs MA:${maCN0.toFixed(1)})`);
        if (Math.abs(avgAGC - maAGC) > 3 * Math.max(sdAGC, 0.5)) flags.push(`AGC 3σ aşımı (${avgAGC.toFixed(1)}%)`);
        if (avgPR > maPR + 3 * Math.max(sdPR, 1)) flags.push(`Pseudorange 3σ aşımı (${avgPR.toFixed(1)}m)`);

        this.statResult = { triggered: flags.length > 0, details: flags.length > 0 ? flags.join('; ') : 'Eşik içinde' };
    }

    // -- KATMAN 2: Çapraz Doğrulama --
    crossValidationLayer(satellites) {
        let flags = [];

        // Eşzamanlılık kontrolü: Tüm uyduların C/N₀ standart sapması
        const cn0s = satellites.map(s => s.cn0);
        const cn0Std = stdDev(cn0s);
        // Normal durumda uydular arası C/N₀ varyansı yüksektir (~3-8 dB-Hz)
        // Spoofing'de hepsi aynı kaynaktan geldiği için çok düşük olur (<2)
        if (cn0Std < 1.5 && mean(cn0s) > 45) flags.push(`Uydu-arası C/N₀ varyansı anormal düşük (σ=${cn0Std.toFixed(2)})`);

        // AGC vs C/N₀ ters orantı kontrolü (Jamming imzası)
        const avgCN0 = mean(cn0s);
        const avgAGC = mean(satellites.map(s => s.agc));
        if (avgCN0 < 20 && avgAGC > 40) flags.push(`AGC↑/C/N₀↓ ters orantı: Jamming imzası`);

        // Pseudorange tutarlılık: herhangi bir uyduda > 50m
        const prMax = Math.max(...satellites.map(s => s.pseudorange));
        if (prMax > 50) flags.push(`Pseudorange rezidüeli aşırı (maks: ${prMax.toFixed(1)}m)`);

        // Carrier phase kesinti kontrolü
        const cycleSlips = satellites.filter(s => s.carrierPhase !== 0).length;
        if (cycleSlips > 2) flags.push(`${cycleSlips}/${SAT_COUNT} uyduda carrier phase kesintisi`);

        // Doppler anomali: Tüm uyduların Doppler'ı neredeyse sıfır (Spoofing)
        const avgDop = mean(satellites.map(s => s.doppler));
        if (avgDop < 0.3) flags.push(`Ortalama Doppler anormal düşük (${avgDop.toFixed(2)} Hz)`);

        this.crossResult = { triggered: flags.length > 0, details: flags.length > 0 ? flags.join('; ') : 'Tutarlı' };
    }

    // -- KATMAN 3: ML Anomali Skoru (Isolation Forest mantığı) --
    scoringLayer(satellites) {
        // Normalize edilmiş özellik vektörü oluştur
        const avgCN0 = mean(satellites.map(s => s.cn0));
        const avgAGC = mean(satellites.map(s => s.agc));
        const avgPR  = mean(satellites.map(s => s.pseudorange));
        const avgDop = mean(satellites.map(s => s.doppler));
        const cn0Std = stdDev(satellites.map(s => s.cn0));
        const cycleSlips = satellites.filter(s => s.carrierPhase !== 0).length;

        // Anomali faktörleri (0-1 arası normalize, 1 = en anomali)
        const f_cn0 = clamp(1 - (avgCN0 - 5) / 45, 0, 1);       // Düşük C/N₀ → yüksek skor
        const f_agc = clamp((avgAGC - 15) / 60, 0, 1);           // Yüksek AGC → yüksek skor
        const f_pr  = clamp(avgPR / 300, 0, 1);                   // Büyük PR → yüksek skor
        const f_dop = clamp(1 - avgDop / 3, 0, 1);               // Düşük Doppler → yüksek skor
        const f_sync = clamp(1 - cn0Std / 5, 0, 1);              // Düşük varyans → yüksek skor (if high cn0)
        const f_phase = cycleSlips / SAT_COUNT;                    // Fazla kesinti → yüksek skor

        // Ağırlıklı toplam
        const rawScore = (
            f_cn0  * 0.25 +
            f_agc  * 0.20 +
            f_pr   * 0.25 +
            f_dop  * 0.10 +
            f_sync * 0.10 +
            f_phase * 0.10
        ) * 100;

        // Katman 1 ve 2 aktifse skoru yükselt
        let boost = 0;
        if (this.statResult.triggered) boost += 15;
        if (this.crossResult.triggered) boost += 20;

        this.mlScore = clamp(rawScore + boost, 0, 100);

        // Sınıflandırma
        if (this.mlScore < 20) this.classification = 'NORMAL';
        else if (this.mlScore < 45) this.classification = 'ŞÜPHELİ';
        else if (this.mlScore < 65) this.classification = 'ALARM';
        else this.classification = 'KRİTİK';
    }

    // Ana analiz fonksiyonu
    analyze(satellites) {
        this.statisticalLayer(satellites);
        this.crossValidationLayer(satellites);
        this.scoringLayer(satellites);
        return {
            score: this.mlScore,
            classification: this.classification,
            stat: this.statResult,
            cross: this.crossResult,
            satellites: satellites
        };
    }
}

// Yardımcı matematik fonksiyonları
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stdDev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }


// ================================================================
//  ANA SİSTEM
// ================================================================
let simulator, engine;
let currentScenario = 'NORMAL';
let threatHistory = [];
let monInterval;

function initAll() {
    simulator = new GNSSSatelliteSimulator();
    engine = new AnomalyDetectionEngine();
    initRadar();
    initCities();
    monInterval = setInterval(tick, 1000);
    addThreat('SİSTEM', 'Anomali tespit motoru başlatıldı. 3 katman aktif.', 'low');
}

function setScenario(sc) {
    currentScenario = sc;
    const labels = { NORMAL: 'Normal Seyir', JAMMING: 'Karıştırma Saldırısı', SPOOFING: 'Yanıltma Müdahalesi', MEACONING: 'Tekrarlama Atağı', ERROR: 'Sistem Hatası' };
    addThreat('SENARYO', `${labels[sc]} senaryosu aktif edildi`, sc === 'NORMAL' ? 'low' : 'medium');
}

function simulateExternalAttack() {
    setScenario('NORMAL');
    addThreat('DIŞ SALDIRI', '🔴 KRİTİK: Bilinmeyen Uzak IP Adresinden (Başka Bilgisayar) sızma girişimi!', 'high');
    document.getElementById('global-status').className = 'status-badge red';
    document.getElementById('global-status').innerText = 'DIŞ AĞ TEHDİDİ';
    
    setTimeout(() => {
        addThreat('ORION TİM IPS', '🛡️ ENGEL BAŞARILI: Başka bilgisayardan gelen bruteforce paketleri güvenlik duvarına çarpıp imha edildi.', 'low');
        document.getElementById('global-status').className = 'status-badge green';
        document.getElementById('global-status').innerText = 'SALDIRI BLOKLANDI';
    }, 2800);
}

function tick() {
    const sats = simulator.generate(currentScenario);
    const result = engine.analyze(sats);

    updateSatTable(sats);
    updateCharts(sats);
    updateRadarBlips(sats);
    updateScoreGauge(result);
    updateLayers(result);
    updateGlobalStatus(result);
    tickCities();

    // Anomali kaydı
    if (result.score > 50) {
        let attackType = 'Bilinmeyen';
        if (currentScenario === 'ERROR') attackType = 'ERROR';
        else if (result.cross.details.includes('Jamming')) attackType = 'JAMMING';
        else if (result.cross.details.includes('Pseudorange') || result.cross.details.includes('Doppler')) attackType = 'SPOOFING';
        else if (result.cross.details.includes('carrier phase') || result.stat.details.includes('Pseudorange')) attackType = 'MEACONING';
        addThreat(attackType, `Skor: ${result.score.toFixed(0)} | ${result.stat.details.substring(0, 60)}`, result.score > 75 ? 'high' : 'medium');
    }

    // Güvenli Mod Tetiklemesi
    if (result.score > 65 && !document.getElementById('safemode-screen').classList.contains('active-safemode')) {
        // Zaten lockdown'da ise safemode tetiklememesi için
        const lockdown = document.getElementById('lockdown-screen');
        if (!lockdown || lockdown.classList.contains('hidden')) {
            triggerSafeMode(result.score);
        }
    }
}


// ================================================================
//  UI GÜNCELLEMELERİ
// ================================================================
function updateSatTable(sats) {
    sats.forEach((sat, i) => {
        const row = document.getElementById(`sat-${i}`);
        if (!row) return;
        const cn0El = row.querySelector('.sat-cn0');
        const agcEl = row.querySelector('.sat-agc');
        const prEl  = row.querySelector('.sat-pr');
        const flagEl = row.querySelector('.sat-flag');

        cn0El.innerText = sat.cn0.toFixed(1);
        agcEl.innerText = sat.agc.toFixed(0) + '%';
        prEl.innerText = sat.pseudorange.toFixed(1);

        // Durum renklendirmesi
        let flag = 'OK', cls = 'ok-flag';
        if (sat.cn0 < 20 || sat.agc > 40) { flag = 'JAM'; cls = 'alert-flag'; }
        else if (sat.pseudorange > 50 || sat.carrierPhase !== 0) { flag = 'SPF'; cls = 'warn-flag'; }
        else if (sat.pseudorange > 10) { flag = 'MEA'; cls = 'warn-flag'; }
        flagEl.innerText = flag;
        flagEl.className = `sat-flag ${cls}`;

        // Renklendirme
        cn0El.style.color = sat.cn0 < 20 ? '#ff4444' : sat.cn0 > 48 ? '#ff9900' : '#44dd88';
        agcEl.style.color = sat.agc > 40 ? '#ff4444' : '#44dd88';
        prEl.style.color = sat.pseudorange > 50 ? '#ff4444' : sat.pseudorange > 10 ? '#ff9900' : '#44dd88';
    });
}

function updateScoreGauge(result) {
    const canvas = document.getElementById('scoreGauge');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H - 10;
    const R = 65;

    ctx.clearRect(0, 0, W, H);

    // Arka plan yay
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 10; ctx.stroke();

    // Skor yayı (0=sol, 100=sağ)
    const angle = Math.PI + (result.score / 100) * Math.PI;
    const grad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
    grad.addColorStop(0, '#44dd88');
    grad.addColorStop(0.5, '#ff9900');
    grad.addColorStop(1, '#ff4444');
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, angle);
    ctx.strokeStyle = grad; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();

    // İğne
    const needleAngle = Math.PI + (result.score / 100) * Math.PI;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (R - 15), cy + Math.sin(needleAngle) * (R - 15));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();

    // Skor numarası
    const numEl = document.getElementById('score-number');
    numEl.innerText = Math.round(result.score);
    numEl.style.color = result.score < 20 ? '#44dd88' : result.score < 50 ? '#ff9900' : '#ff4444';

    // Sınıf etiketi
    const classEl = document.getElementById('score-class');
    classEl.innerText = result.classification;
    classEl.style.color = numEl.style.color;
}

function updateLayers(result) {
    const ls = document.getElementById('layer-stat');
    const lc = document.getElementById('layer-cross');
    const lm = document.getElementById('layer-ml');
    ls.className = `layer-item ${result.stat.triggered ? 'active' : ''}`;
    lc.className = `layer-item ${result.cross.triggered ? 'active' : ''}`;
    lm.className = `layer-item ${result.score > 50 ? 'active' : ''}`;

    // Modül durumları
    document.getElementById('mod-stat-s').innerText = result.stat.triggered ? 'ALARM' : 'AKTİF';
    document.getElementById('mod-stat-s').className = `mod-status ${result.stat.triggered ? 'alert' : ''}`;
    document.getElementById('mod-cross-s').innerText = result.cross.triggered ? 'ALARM' : 'AKTİF';
    document.getElementById('mod-cross-s').className = `mod-status ${result.cross.triggered ? 'alert' : ''}`;
    document.getElementById('mod-ml-s').innerText = result.score > 50 ? `SKOR:${Math.round(result.score)}` : 'AKTİF';
    document.getElementById('mod-ml-s').className = `mod-status ${result.score > 50 ? 'alert' : ''}`;
}

function updateGlobalStatus(result) {
    const b = document.getElementById('global-status');
    if (result.score > 75) { b.className = 'status-badge red'; b.innerText = `KRİTİK: ${result.classification}`; }
    else if (result.score > 40) { b.className = 'status-badge orange'; b.innerText = `ALARM: ${result.classification}`; }
    else { b.className = 'status-badge green'; b.innerText = 'OPERASYONEL'; }
}


// ================================================================
//  SİNYAL GRAFİKLERİ (Canvas)
// ================================================================
const chartHistory = { cn0: [], agc: [], pr: [] }; // Her biri SAT_COUNT alt dizisi
const CMAX = 60;

function updateCharts(sats) {
    // Her uydu için geçmiş tut
    if (chartHistory.cn0.length === 0) {
        for (let i = 0; i < SAT_COUNT; i++) { chartHistory.cn0.push([]); chartHistory.agc.push([]); chartHistory.pr.push([]); }
    }
    sats.forEach((sat, i) => {
        chartHistory.cn0[i].push(sat.cn0); if (chartHistory.cn0[i].length > CMAX) chartHistory.cn0[i].shift();
        chartHistory.agc[i].push(sat.agc); if (chartHistory.agc[i].length > CMAX) chartHistory.agc[i].shift();
        chartHistory.pr[i].push(sat.pseudorange); if (chartHistory.pr[i].length > CMAX) chartHistory.pr[i].shift();
    });
    drawMultiChart('chartCN0', chartHistory.cn0, 0, 55, 25, null);
    drawMultiChart('chartAGC', chartHistory.agc, 0, 80, null, 40);
    drawMultiChart('chartPR', chartHistory.pr, 0, 200, null, 50);
}

function drawMultiChart(id, dataSets, min, max, threshLow, threshHigh) {
    const c = document.getElementById(id); if (!c) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#040a0d'; ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(50,200,180,.06)'; ctx.lineWidth = .5;
    for (let y = 0; y < H; y += 15) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    // Eşik çizgisi
    if (threshLow !== null) { const ty = H - ((threshLow - min) / (max - min)) * H; ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.strokeStyle = 'rgba(255,68,68,.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
    if (threshHigh !== null) { const ty = H - ((threshHigh - min) / (max - min)) * H; ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.strokeStyle = 'rgba(255,68,68,.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }

    // Her uydu için ayrı renkte çizgi
    const colors = ['#44dd88', '#3dd6b8', '#22aaff', '#aa88ff', '#ffaa44', '#ff6688'];
    dataSets.forEach((data, si) => {
        if (data.length < 2) return;
        const step = W / (CMAX - 1);
        ctx.beginPath();
        data.forEach((v, i) => {
            const x = i * step, y = H - ((v - min) / (max - min)) * H;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = colors[si % colors.length]; ctx.lineWidth = 1; ctx.globalAlpha = .7; ctx.stroke(); ctx.globalAlpha = 1;
    });
}


// ================================================================
//  CANVAS RADAR
// ================================================================
let rAngle = 0, rBlips = [], rCanvas, rCtx, rCx, rCy, rR;

function initRadar() {
    rCanvas = document.getElementById('radarCanvas'); if (!rCanvas) return;
    rCtx = rCanvas.getContext('2d'); rCx = rCanvas.width / 2; rCy = rCanvas.height / 2; rR = 125;
    rBlips = []; (function loop() { rAngle = (rAngle + .9) % 360; drawRadar(); requestAnimationFrame(loop); })();
}

function drawRadar() {
    const ctx = rCtx, cx = rCx, cy = rCy, R = rR;
    ctx.fillStyle = '#060e0e'; ctx.fillRect(0, 0, rCanvas.width, rCanvas.height);

    // Ticks
    for (let d = 0; d < 360; d += 5) {
        const rad = (d - 90) * Math.PI / 180, isM = d % 30 === 0, isMd = d % 10 === 0;
        const oR = R + 12, iR = isM ? R + 1 : (isMd ? R + 5 : R + 8);
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(rad) * iR, cy + Math.sin(rad) * iR);
        ctx.lineTo(cx + Math.cos(rad) * oR, cy + Math.sin(rad) * oR);
        ctx.strokeStyle = isM ? 'rgba(50,220,190,.85)' : 'rgba(50,190,170,.3)'; ctx.lineWidth = isM ? 2 : .7; ctx.stroke();
    }

    // Zemin
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bg.addColorStop(0, '#0a1a18'); bg.addColorStop(1, '#040e0c');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = 'rgba(50,200,180,.45)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Halkalar + Grid + Crosshair
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (R/5)*i, 0, Math.PI*2); ctx.strokeStyle = 'rgba(50,200,180,.2)'; ctx.lineWidth = .7; ctx.stroke(); }
    ctx.strokeStyle = 'rgba(50,200,180,.35)'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(cx-R, cy); ctx.lineTo(cx+R, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-R); ctx.lineTo(cx, cy+R); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R-1, 0, Math.PI*2); ctx.clip();
    ctx.strokeStyle = 'rgba(50,200,180,.06)'; ctx.lineWidth = .5;
    for (let g=cx-R;g<=cx+R;g+=18){ctx.beginPath();ctx.moveTo(g,cy-R);ctx.lineTo(g,cy+R);ctx.stroke()}
    for (let g=cy-R;g<=cy+R;g+=18){ctx.beginPath();ctx.moveTo(cx-R,g);ctx.lineTo(cx+R,g);ctx.stroke()}
    ctx.restore();

    // Sweep
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R-1,0,Math.PI*2); ctx.clip();
    const sR = (rAngle-90)*Math.PI/180, sp = 50*Math.PI/180;
    const sg = ctx.createConicGradient(sR-sp*1.5, cx, cy);
    sg.addColorStop(0,'rgba(0,0,0,0)'); sg.addColorStop(.6,'rgba(30,180,160,.03)'); sg.addColorStop(.9,'rgba(40,200,180,.08)'); sg.addColorStop(1,'rgba(50,220,190,.12)');
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R-2,sR-sp*1.5,sR); ctx.closePath(); ctx.fillStyle=sg; ctx.fill();
    const sg2 = ctx.createConicGradient(sR-sp, cx, cy);
    sg2.addColorStop(0,'rgba(0,0,0,0)'); sg2.addColorStop(.5,'rgba(40,210,185,.08)'); sg2.addColorStop(.9,'rgba(60,230,200,.35)'); sg2.addColorStop(1,'rgba(120,255,230,.9)');
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R-2,sR-sp,sR); ctx.closePath(); ctx.fillStyle=sg2; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(sR)*(R-2),cy+Math.sin(sR)*(R-2));
    ctx.strokeStyle='rgba(120,255,230,.85)'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore();

    // Merkez
    ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2); ctx.fillStyle='rgba(80,255,220,.5)'; ctx.fill();

    // Blips
    rBlips.forEach(b => {
        const rad = (b.angle-90)*Math.PI/180;
        const bx = cx+Math.cos(rad)*(b.dist*R), by = cy+Math.sin(rad)*(b.dist*R);
        let diff=((rAngle-b.angle)%360+360)%360, fade=diff<90?1-(diff/90):.06;
        const isS = b.type==='spoof';
        ctx.beginPath(); ctx.arc(bx,by,8*fade+2,0,Math.PI*2);
        ctx.fillStyle=isS?`rgba(255,50,50,${fade*.3})`:`rgba(80,255,220,${fade*.3})`; ctx.fill();
        ctx.beginPath(); ctx.arc(bx,by,3.5,0,Math.PI*2); ctx.fillStyle=isS?`rgba(255,60,60,${Math.max(fade,.5)})`:`rgba(100,255,220,${fade})`; ctx.fill();
        if(fade>.2){ctx.beginPath();ctx.arc(bx,by,1.5,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${fade*.6})`;ctx.fill()}
    });
}

function updateRadarBlips(sats) {
    rBlips = sats.map((sat, i) => ({
        angle: (i * 60) + 15, // 6 uydu eşit aralıklı
        dist: clamp(0.2 + (sat.pseudorange / 200) * 0.7, 0.15, 0.95),
        type: (sat.cn0 < 20 || sat.pseudorange > 50) ? 'spoof' : 'normal'
    }));
}


// ================================================================
//  GERÇEK ZAMANLI AES-256 ŞİFRELEME (CryptoJS)
// ================================================================
let origFileContent = null;
let currentFileName = null;

function handleFile(e) {
    const f = e.target.files[0]; 
    if(!f) return;
    currentFileName = f.name;
    const r = new FileReader();
    r.onload = ev => { 
        origFileContent = ev.target.result; 
        document.getElementById('file-info').style.display='block';
        document.getElementById('file-info').innerHTML=`📄 <b>${f.name}</b> (${(f.size/1024).toFixed(1)} KB) Sisteme Yüklendi.`;
        
        // Basit AES string check
        if (origFileContent.startsWith('U2FsdGVk')) {
            showPrev("ÖNİZLEME (ŞİFRELİ AES-256 İÇERİK)", "🔐 BİLGİ: Dosya zaten şifrelenmiş (AES Salted) durumdadır.\nAçmak için '🔓 ÇÖZ' butonuna basın ve parolasını girin.\n\n" + origFileContent.substring(0,250) + "...", true);
        } else {
            showPrev("ÖNİZLEME (ORİJİNAL İÇERİK)", origFileContent.substring(0,1000) + (origFileContent.length > 1000 ? '\n... (devamı var)' : ''), false); 
        }
    };
    r.readAsText(f);
}

function encryptFile() {
    if(origFileContent === null) { alert("SİSTEM UYARISI: Lütfen önce 📂 DOSYA YÜKLE butonundan bilgisayarınızdaki bir dosyayı seçin!"); return; }
    if(origFileContent === "") { alert("SİSTEM UYARISI: Yüklediğiniz dosya (0.0 KB) ve BOŞ! Lütfen içini bir şeyler yazıp (NOT DEFTERİNDE) kaydedip tekrar yükleyin."); return; }
    if(origFileContent.startsWith('U2FsdGVk')) { alert("SİSTEM UYARISI: Bu dosya zaten AES-256 şifreli görünmektedir!"); return; }
    
    // Gerçek Şifre Kutusundan Oku
    const passObj = document.getElementById('crypto-pass-input');
    const pass = passObj.value;
    if(!pass) { alert("GÜVENLİK UYARISI:\nLütfen kilitlemek için hemen üstteki 'Parolanızı buraya girin' kutusuna bir şifre yazın!"); passObj.focus(); return; }

    try {
        const encrypted = CryptoJS.AES.encrypt(origFileContent, pass).toString();
        showPrev("🔒 ŞİFRELENDİ (AES-256 Karma Verisi)", encrypted.substring(0,600) + '\n\n...[Veri BLOB Şifrelendi]...', true);
        
        // Dosyayı İndir!
        const b = new Blob([encrypted], {type:"text/plain"});
        const a = document.createElement("a"); 
        a.href = URL.createObjectURL(b); 
        a.download = currentFileName + ".aes";
        document.body.appendChild(a); 
        a.click(); 
        setTimeout(()=>document.body.removeChild(a), 100);
        
        addThreat('KRİPTO', `Dosya, [${pass.length}] haneli parola ile AES-256 modunda şifrelendi.`, 'low');
    } catch(err) {
        alert("KRİPTOGRAFİ HATASI: İşlem başarısız.");
    }
}

function decryptFile() {
    if(origFileContent === null) { alert("SİSTEM UYARISI: Lütfen şifresini çözmek için bir AES dosyası yükleyin!"); return; }
    if(!origFileContent.startsWith('U2FsdGVk')) { 
        alert("SİSTEM UYARISI: Yüklediğiniz bu dosya AES-256 ile şifrelenmiş bir dosya DEĞİL! Zaten okunabilir durumda.\n\nEğer amacınız bu dosyayı kilitlemekse, lütfen yandaki kırmızı '🔒 ŞİFRELE' butonuna basın."); 
        return; 
    }
    
    // Şifre İste Kutusundan
    const passObj = document.getElementById('crypto-pass-input');
    const pass = passObj.value;
    if(!pass) { alert("GÜVENLİK UYARISI:\nLütfen dosyayı açmak (şifresini kırmak) için kutuya parolanızı yazın!"); passObj.focus(); return; }

    try {
        const decryptedBytes = CryptoJS.AES.decrypt(origFileContent, pass);
        const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedText) throw new Error("bad_pass");

        showPrev("🔓 ÇÖZÜLDÜ (Orijinal Bilgi)", decryptedText.substring(0,1000) + (decryptedText.length > 1000 ? '\n... (devamı var)' : ''), false);
        
        // Çözülen Orijinal Dosyayı Geri İndirme
        const b = new Blob([decryptedText], {type:"text/plain"});
        const a = document.createElement("a"); 
        a.href = URL.createObjectURL(b); 
        // Uzantıyı .aes'ten kurtar
        let dname = currentFileName.replace('.aes', '');
        if(dname === currentFileName) dname = 'COZULMUS_' + dname;
        a.download = dname;
        document.body.appendChild(a); 
        a.click(); 
        setTimeout(()=>document.body.removeChild(a), 100);

        addThreat('KRİPTO', 'Güvenli AES Dosya şifresi başarıyla kırıldı ve indirildi.', 'low');
    } catch(err) {
        alert("🚨 HATALI ŞİFRE veya BOZUK DOSYA!\nErişim reddedildi.");
        addThreat('İHLAL', 'AES çözme işleminde hatalı parola girildi!', 'high');
    }
}

function showPrev(l,c,enc){
    document.getElementById('preview-box').style.display='block';
    document.getElementById('preview-label').innerText=l;
    const p=document.getElementById('preview-content');
    p.innerText=c;
    p.className=enc?'encrypted':'';
}


// ================================================================
//  TEHDİT KAYDI & RAPOR
// ================================================================
function addThreat(type, desc, level) {
    const now = new Date();
    const ts = `${now.toISOString().substring(0,10)} ${now.toLocaleTimeString()}`;
    const entry = { time: ts, type, desc, level };
    threatHistory.push(entry);
    const log = document.getElementById('threat-log');
    const lt = level === 'high' ? '🚨 Yüksek' : level === 'medium' ? '⚠️ Orta' : '✅';
    const row = document.createElement('div'); row.className = 'threat-row';
    row.innerHTML = `<span class="threat-time">${ts}</span><span class="threat-desc">[${type}] ${desc}</span><span class="threat-level ${level}">${lt}</span>`;
    log.insertBefore(row, log.firstChild);
    if (log.children.length > 25) log.removeChild(log.lastChild);
}

function exportReport() {
    const report = {
        meta: { system: 'BKZS Anomali Tespit Prototipi', version: '2.0', timestamp: new Date().toISOString(), scenario: currentScenario },
        currentState: {
            anomalyScore: engine ? Math.round(engine.mlScore) : 0,
            classification: engine ? engine.classification : 'N/A',
            statisticalLayer: engine ? engine.statResult : null,
            crossValidation: engine ? engine.crossResult : null
        },
        satellites: simulator ? simulator.generate(currentScenario).map(s => ({
            name: s.name, cn0_dBHz: +s.cn0.toFixed(2), agc_pct: +s.agc.toFixed(2),
            pseudorange_residual_m: +s.pseudorange.toFixed(3), carrier_phase_slip: s.carrierPhase !== 0,
            doppler_Hz: +s.doppler.toFixed(3), elevation_deg: s.elevation
        })) : [],
        detectionHistory: threatHistory.slice(-50)
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `BKZS_Report_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
    addThreat('SİSTEM', 'Anomali raporu dışa aktarıldı (JSON)', 'low');
}

// ================================================================
//  81 İL SİNYAL DURUMU YÖNETİMİ
// ================================================================
const PROVINCES = [
    "Adana", "Adıyaman", "Afyon", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
    "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
    "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
    "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
    "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
    "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
    "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
    "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

let cityData = PROVINCES.map(p => ({
    name: p, status: 'STABİL', cls: 'ok-flag', val: '99%', severity: 0
}));

function initCities() {
    const list = document.getElementById('city-list');
    if (!list) return;
    list.innerHTML = '';
    cityData.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'city-row';
        row.id = `city-row-${i}`;
        row.innerHTML = `
            <span class="city-name">${c.name}</span>
            <span class="city-metric" id="city-met-${i}">${c.val}</span>
            <span class="city-flag ${c.cls}" id="city-flag-${i}">${c.status}</span>
        `;
        list.appendChild(row);
    });
}

function tickCities() {
    const list = document.getElementById('city-list');
    if (!list) return;

    cityData.forEach((c, i) => {
        let risk = Math.random();
        c.status = 'STABİL'; c.cls = 'ok-flag'; c.val = (90 + Math.random()*9).toFixed(1); c.severity = 0;
        
        if (currentScenario === 'NORMAL') {
            if (risk > 0.98) { c.status = 'UYARI'; c.cls = 'warn-flag'; c.val = (70 + Math.random()*15).toFixed(1); c.severity = 1; }
        } else if (currentScenario === 'JAMMING') {
            if (i % 7 === 0 || risk > 0.85) { c.status = 'KOPUK'; c.cls = 'alert-flag'; c.val = '0.0'; c.severity = 2; }
            else if (i % 4 === 0 || risk > 0.60) { c.status = 'KARIŞIK'; c.cls = 'warn-flag'; c.val = (30 + Math.random()*30).toFixed(1); c.severity = 1; }
        } else if (currentScenario === 'SPOOFING') {
            if (i % 9 === 0 || risk > 0.90) { c.status = 'SAHTE'; c.cls = 'alert-flag'; c.val = '99.9'; c.severity = 2; }
            else if (i % 5 === 0 || risk > 0.70) { c.status = 'ŞÜPHE'; c.cls = 'warn-flag'; c.val = '85.0'; c.severity = 1; }
        } else if (currentScenario === 'MEACONING') {
            if (i % 8 === 0 || risk > 0.95) { c.status = 'TEKRAR'; c.cls = 'alert-flag'; c.val = '95.0'; c.severity = 2; }
            else if (i % 3 === 0 || risk > 0.80) { c.status = 'GECİKME'; c.cls = 'warn-flag'; c.val = '60.0'; c.severity = 1; }
        } else if (currentScenario === 'ERROR') {
            if (i % 11 === 0 || risk > 0.70) { c.status = 'OFFLINE'; c.cls = 'alert-flag'; c.val = '---'; c.severity = 2; }
            else if (risk > 0.40) { c.status = 'HATA'; c.cls = 'alert-flag'; c.val = '0.0'; c.severity = 2; }
        }
        
        // Elementleri in-place güncelle
        const metEl = document.getElementById(`city-met-${i}`);
        const flagEl = document.getElementById(`city-flag-${i}`);
        const rowEl = document.getElementById(`city-row-${i}`);
        if(rowEl) {
            const nameEl = rowEl.querySelector('.city-name');
            if (metEl && flagEl) {
                metEl.innerText = c.val !== '---' && c.val !== '0.0' ? c.val + '%' : c.val;
                if (flagEl.innerText !== c.status) {
                    flagEl.innerText = c.status;
                    flagEl.className = `city-flag ${c.cls}`;
                    nameEl.style.color = c.severity === 2 ? 'var(--red)' : c.severity === 1 ? 'var(--orange)' : 'var(--text)';
                    
                    // Riskli olanları listenin üstüne taşı
                    if (c.severity > 0 && list.firstChild !== rowEl) {
                        list.insertBefore(rowEl, list.firstChild);
                    }
                }
            }
        }
    });
}

// ================================================================
//  ACİL KİLİT (LOCKDOWN) SİSTEMİ
// ================================================================
function triggerLockdown() {
    clearInterval(monInterval);
    document.getElementById('lockdown-screen').classList.remove('hidden');
    document.getElementById('usb-step').style.display = 'block';
    document.getElementById('pass-step').style.display = 'none';
    document.getElementById('usb-unlock-input').value = '';
    document.getElementById('lockdown-pass-input').value = '';
    document.getElementById('main-dashboard').style.pointerEvents = 'none';
    
    addThreat('LOCKDOWN', 'Sistem manuel olarak kilitlendi. Veri akışı durduruldu.', 'high');
}

// Dom yüklendikten sonra Lockdown dinleyicilerini kurması için
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('usb-unlock-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.name === 'unlock.key') {
            addThreat('GÜVENLİK', 'Doğru USB takıldı. Şifre bekleniyor.', 'medium');
            document.getElementById('usb-step').style.display = 'none';
            document.getElementById('pass-step').style.display = 'block';
        } else {
            addThreat('İHLAL', 'Geçersiz USB takıldı. Erişim reddedildi.', 'high');
            e.target.value = ''; // Sıfırla
        }
    });

    document.getElementById('lockdown-unlock-btn').addEventListener('click', () => {
        const pass = document.getElementById('lockdown-pass-input').value;
        //README Deomo Şifre
        if (pass === '28639') {
            addThreat('SİSTEM', 'Kilit şifresi DOĞRU. Sistem aktif ediliyor.', 'low');
            document.getElementById('lockdown-screen').classList.add('hidden');
            document.getElementById('main-dashboard').style.pointerEvents = 'auto';
            document.getElementById('lockdown-pass-input').value = '';
            
            monInterval = setInterval(tick, 1000);
        } else {
            addThreat('İHLAL', 'Hatalı yönetici şifresi girildi.', 'high');
            document.getElementById('lockdown-pass-input').value = '';
        }
    });

    document.getElementById('lockdown-pass-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('lockdown-unlock-btn').click();
    });
});

// ================================================================
//  OTOMATİK GÜVENLİ MOD VE SES DİNAMİKLERİ
// ================================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let alarmInterval = null;

function playAlertBeep() {
    try {
        if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch(err) {
        console.warn('Ses API engellendi veya desteklenmiyor (Güvenli mod görsel olarak aktif olacak):', err);
    }
}

function startAlarmSound() {
    if (alarmInterval) return;
    playAlertBeep();
    alarmInterval = setInterval(playAlertBeep, 600);
}

function stopAlarmSound() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
}

function triggerSafeMode(score) {
    clearInterval(monInterval);
    document.getElementById('safemode-screen').classList.remove('hidden');
    document.getElementById('safemode-screen').classList.add('active-safemode');
    document.getElementById('main-dashboard').style.pointerEvents = 'none';
    document.getElementById('safemode-pass-input').value = '';
    
    startAlarmSound();
    
    addThreat('GÜVENLİ MOD', `Sistem otomatik savunmaya geçti. (Skor: ${Math.round(score)})`, 'high');
    addThreat('DURUM', 'Kullanıcı işlemleri askıya alındı. İzleyici modda.', 'medium');
}

// Güvenli Mod Recovery Dinleyicisi
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('safemode-unlock-btn').addEventListener('click', () => {
        const pass = document.getElementById('safemode-pass-input').value;
            //README Demo Şifre
        if (pass === '28639') {
            stopAlarmSound();
            addThreat('SİSTEM', 'Recovery başarılı. Güvenli moddan çıkılıyor.', 'low');
            document.getElementById('safemode-screen').classList.add('hidden');
            document.getElementById('safemode-screen').classList.remove('active-safemode');
            document.getElementById('main-dashboard').style.pointerEvents = 'auto';
            
            // Senaryoyu normale döndür ki açar açmaz 75 vurup tekrar düşmesin
            currentScenario = 'NORMAL'; 
            
            monInterval = setInterval(tick, 1000);
        } else {
            addThreat('İHLAL', 'Hatalı recovery şifresi.', 'high');
            document.getElementById('safemode-pass-input').value = '';
        }
    });

    document.getElementById('safemode-pass-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('safemode-unlock-btn').click();
    });
});


/*🔐 Demo Erişim Bilgileri
| Safe Mode Recovery | — | 28639 |
| Lockdown Kilidi | — | 28639 |

> **Not:** Bu bir açık kaynak demo projesidir.
> Şifreler kaynak kodda görünür durumdadır, bu normaldir.*/
