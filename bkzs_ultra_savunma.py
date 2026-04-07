import customtkinter as ctk
import os
import time
import datetime
import requests
import pandas as pd
import random
import uuid
from cryptography.fernet import Fernet
from sklearn.ensemble import IsolationForest

# ==========================================
# ⚙️ KRİTİK GÜVENLİK AYARLARI 
# ==========================================
HEDEF_PC_ISMI = "Fatih"                 
HEDEF_MAC = "60:45:bd:8d:7f:0b"         
HEDEF_SEHIR = "Istanbul"                
CALISMA_SAATLERI = (8, 23)              
DOGRULAMA_METNI = "BKZS-ULTRA-2026"     
HIZ_ESIGI = 0.7                         

class BKZSTamKoruma(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("BKZS Ana Savunma Terminali (Chrono-Shift Aktif)")
        self.geometry("650x850") # Senaryo butonları için çok az uzatıldı
        ctk.set_appearance_mode("dark")

        # ŞİFRELEME (KRİPTOGRAFİ) VE ML BÖLÜMÜ
        self.cipher_key = Fernet.generate_key()
        self.cipher = Fernet(self.cipher_key)
        self.sinyal_senaryosu = "NORMAL"
        self.anomali_radari_aktif = False # Başta pasif, giriş yapınca YZ aktif olacak.
        self.ml_modeli_egit()

        self.hata_sayisi = 0 
        self.aktif_sinyal = 0 

        self.header = ctk.CTkLabel(self, text="📡 BKZS ÇOK KATMANLI GÜVENLİK AĞI", font=("Consolas", 22, "bold"), text_color="#00FFCC")
        self.header.pack(pady=20)

        self.signal_frame = ctk.CTkFrame(self, fg_color="#101010", border_width=1, border_color="#555")
        self.signal_frame.pack(pady=5, padx=20, fill="x")
        self.signal_display = ctk.CTkLabel(self.signal_frame, text="[ BAŞLATILIYOR... ]", font=("Consolas", 18), text_color="#00FF00")
        self.signal_display.pack(pady=10)
        self.update_signals()

        self.log_box = ctk.CTkTextbox(self, height=250, width=600, font=("Consolas", 12), text_color="#00FF00", fg_color="black")
        self.log_box.pack(pady=15)
        self.log_box.insert("0.0", ">>> SİSTEM AKTİF. TÜM PROTOKOLLER BEKLEMEDE...\n" + "="*60 + "\n")

        self.entry_label = ctk.CTkLabel(self, text=f"Biyometrik Onay Metni: {DOGRULAMA_METNI}", text_color="gray", font=("Arial", 12))
        self.entry_label.pack()
        
        self.kutu_hafizasi = ctk.StringVar() 
        
        self.entry = ctk.CTkEntry(self, textvariable=self.kutu_hafizasi, placeholder_text="Metni girin...", width=400, height=45)
        self.entry.pack(pady=10)
        self.entry.bind("<KeyPress>", self.start_timer)

        self.btn = ctk.CTkButton(self, text="SİSTEME GİRİŞ YAP VE ANALİZ ET", command=self.yonlendirici_kontrol, 
                                 fg_color="#1f538d", hover_color="#00FFCC", height=50, font=("Arial", 14, "bold"))
        self.btn.pack(pady=20)

        self.start_time = None
        
        # Test için Senaryo Butonları (Orijinal Arayüzü bozmadan en sona eklendi)
        self.sim_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.sim_frame.pack(pady=10)
        ctk.CTkButton(self.sim_frame, text="Normal", width=80, fg_color="#1c4728", command=lambda: self.set_senaryo("NORMAL")).pack(side="left", padx=5)
        ctk.CTkButton(self.sim_frame, text="Jamming (Karartma)", width=120, fg_color="#9e3e1a", command=lambda: self.set_senaryo("JAMMING")).pack(side="left", padx=5)
        ctk.CTkButton(self.sim_frame, text="Spoofing (Yanıltma)", width=120, fg_color="#7b1891", command=lambda: self.set_senaryo("SPOOFING")).pack(side="left", padx=5)

    def set_senaryo(self, senaryo):
        self.sinyal_senaryosu = senaryo
        if self.anomali_radari_aktif:
            self.log_box.insert("end", f"\n>>> [SIMULASYON] Uydu Sinyal Akışı Değiştirildi: {senaryo}\n")
            self.log_box.see("end")

    def ml_modeli_egit(self):
        # YZ Modelini arka planda eğit
        veri = [[random.uniform(38.0, 48.0), random.uniform(10.0, 15.0), random.uniform(0.1, 2.5), random.uniform(1.0, 3.0)] for _ in range(300)]
        self.model = IsolationForest(contamination=0.01, random_state=42)
        self.model.fit(pd.DataFrame(veri, columns=["SNR", "AGC", "Pos", "Dop"]))

    def update_signals(self):
        # Sinyal simulasyonu (Senaryoya göre)
        if self.sinyal_senaryosu == "NORMAL":
            snr, agc, pos, dop = random.uniform(38, 48), random.uniform(10, 15), random.uniform(0.1, 2.5), random.uniform(1.0, 3.0)
        elif self.sinyal_senaryosu == "JAMMING":
            snr, agc, pos, dop = random.uniform(5, 18), random.uniform(40, 65), random.uniform(0, 1.5), random.uniform(1.5, 4.0)
        else: # SPOOFING
            snr, agc, pos, dop = random.uniform(49, 52), random.uniform(10, 12), random.uniform(300, 800), random.uniform(0, 0.2)
            
        self.signal_display.configure(text=f"[ SNR:{snr:.1f} | AGC:{agc:.1f} | POS:{pos:.1f} | DOP:{dop:.1f} ]")
        
        # EĞER GİRİŞ BAŞARILI İSE (YZ RADAR AKTİFSE)
        if self.anomali_radari_aktif:
            df_yeni = pd.DataFrame([[snr, agc, pos, dop]], columns=["SNR", "AGC", "Pos", "Dop"])
            tahmin = self.model.predict(df_yeni)[0]
            
            if tahmin == -1:
                ts = datetime.datetime.now().strftime('%H:%M:%S')
                if snr < 25 and agc > 35:
                    self.log_box.insert("end", f"[{ts}] ⚠️ YZ RADAR İKAZ: JAMMING (Karıştırma) TESPİT EDİLDİ! (Değerler Aşırı Gürültülü)\n")
                elif pos > 100:
                    self.log_box.insert("end", f"[{ts}] 🚨 YZ RADAR İKAZ: SPOOFING (Yanıltma) TESPİT EDİLDİ! (İmkansız Konum Sıçraması)\n")
                self.log_box.see("end")

        self.after(1200, self.update_signals)

    def get_mac(self):
        return ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff) for ele in range(0, 8*6, 8)][::-1])

    def start_timer(self, event):
        if self.start_time is None: self.start_time = time.time()

    def yonlendirici_kontrol(self):
        if self.hata_sayisi == 0:
            self.ilk_analizi_yap()
        elif self.hata_sayisi == 1:
            self.kripto_dogrulama_yap()

    def ilk_analizi_yap(self):
        self.log_box.delete("3.0", "end")
        self.log_box.insert("end", "\n[!] 5 KATMANLI DERİN ANALİZ BAŞLATILDI...\n" + "-"*60 + "\n")
        self.update()
        
        anomali_skoru = 0
        pc_name = os.getlogin()
        my_mac = self.get_mac()

        if pc_name != HEDEF_PC_ISMI or my_mac != HEDEF_MAC: anomali_skoru += 1
        try:
            city = requests.get('https://ipapi.co/json/', timeout=3).json().get('city', '')
            if city != HEDEF_SEHIR: anomali_skoru += 1
        except:
            anomali_skoru += 1

        saat = datetime.datetime.now().hour
        if not (CALISMA_SAATLERI[0] <= saat <= CALISMA_SAATLERI[1]): anomali_skoru += 1

        text = self.kutu_hafizasi.get() 
        speed = (time.time() - self.start_time) / len(text) if self.start_time and len(text) > 0 else 999
        if text != DOGRULAMA_METNI or speed > HIZ_ESIGI: anomali_skoru += 1

        if anomali_skoru == 0:
            self.log_box.insert("end", "\n✅ BÜTÜN TESTLER GEÇİLDİ. BKZS VERİTABANI BAĞLANDI.\n", "green")
            self.log_box.insert("end", ">>> YZ SİNYAL İZLEME RADARI (Isolation Forest) DEVREYE GİRDİ.\n", "cyan")
            self.btn.configure(fg_color="green", text="SİSTEM AKTİF")
            self.anomali_radari_aktif = True # RADARI AÇ. Artık Jamming / Spoofing taraması yapılacak.
        else:
            self.hata_sayisi = 1
            self.aktif_sinyal = random.randint(10, 80) 
            self.log_box.insert("end", f"\n⚠️ {anomali_skoru} ANOMALİ TESPİT EDİLDİ! ZAMAN-SENKRONİZASYONLU KRİPTO PROTOKOLÜ DEVREDE.\n", "orange")
            self.kutu_hafizasi.set("") 
            self.entry.configure(placeholder_text="Kriptografik Yanıtı Girin...", border_color="orange")
            self.entry_label.configure(text=f"SARI ALARM | GELEN SİNYAL KODU: [{self.aktif_sinyal}]", text_color="orange", font=("Arial", 16, "bold"))
            self.btn.configure(fg_color="#cc7000", hover_color="#ff8c00", text="YANITI DOĞRULA")

    def kripto_dogrulama_yap(self):
        ham_metin = self.kutu_hafizasi.get()
        self.log_box.insert("end", f"\n[!] KRİPTO ANALİZİ: Kutudan Okunan Ham Veri: '{ham_metin}'\n")
        self.update()
        time.sleep(0.5) 

        sadece_rakamlar = ''.join(filter(str.isdigit, ham_metin))
        
        if not sadece_rakamlar:
            self.log_box.insert("end", "⚠️ DİKKAT: Kutuda hiçbir sayı algılanmadı! Lütfen kutuya tıklayıp sayıyı yazın.\n")
            return 
            
        girilen_sayi = int(sadece_rakamlar)
        su_an_dakika = datetime.datetime.now().minute
        dakika_eski = su_an_dakika - 1 if su_an_dakika > 0 else 59
        dakika_yeni = su_an_dakika + 1 if su_an_dakika < 59 else 0
        
        kabul_edilen_sayilar = [self.aktif_sinyal + su_an_dakika, self.aktif_sinyal + dakika_eski, self.aktif_sinyal + dakika_yeni]
        
        if girilen_sayi in kabul_edilen_sayilar:
            self.log_box.insert("end", f"✅ DOĞRULANDI! ONAY KODU: {girilen_sayi}\n", "green")
            self.log_box.insert("end", ">>> YZ SİNYAL İZLEME RADARI (Isolation Forest) DEVREYE GİRDİ.\n", "cyan")
            self.btn.configure(fg_color="green", text="SİSTEM AKTİF", state="disabled")
            self.entry_label.configure(text="Güvenlik İhlali Giderildi.", text_color="green")
            self.entry.configure(state="disabled")
            self.anomali_radari_aktif = True # Sarı alarm düzelince de radar açılır
        else:
            self.hata_sayisi = 2 
            itiraf_mesaji = f"🚨 HATALI YANIT!\nGirilen: {girilen_sayi} | Beklenen: {self.aktif_sinyal + su_an_dakika}\nSİSTEM TAMAMEN KİLİTLENDİ!"
            self.log_box.insert("end", itiraf_mesaji + "\n", "red")
            self.btn.configure(fg_color="red", text="SİSTEM BLOKE EDİLDİ", state="disabled")
            self.entry.configure(state="disabled") 
            self.entry_label.configure(text="KIRMIZI ALARM: YETKİSİZ ERİŞİM", text_color="red")
            self.generate_fake_data()

    def generate_fake_data(self):
        fake_lat = 41.000 + random.uniform(0.1, 0.3)
        fake_lon = 28.900 + random.uniform(0.1, 0.3)
        data = {
            'Zaman': [datetime.datetime.now()],
            'Hedef_Lat': [fake_lat], 'Hedef_Lon': [fake_lon],
            'Sinyal': [random.randint(-110, -90)], 'Durum': ['DOĞRULANMIŞ_VERİ']
        }
        
        # VERİ KORUMA / ŞİFRELEME (AES-256)
        csv_icerik = pd.DataFrame(data).to_csv(index=False)
        sifreli_icerik = self.cipher.encrypt(csv_icerik.encode())
        
        with open("BKZS_Honeypot_Veri.csv.enc", "wb") as f:
            f.write(sifreli_icerik)
            
        self.log_box.insert("end", "\n[!] AKTİF ALDATMA DEVREDE: Sahte koordinatlar 'AES-256' ile Kriptolandı!")
        self.log_box.insert("end", "\n[!] Saldırgana şifreli yem dosyası bırakıldı (BKZS_Honeypot_Veri.csv.enc)")

if __name__ == "__main__":
    app = BKZSTamKoruma()
    app.mainloop()