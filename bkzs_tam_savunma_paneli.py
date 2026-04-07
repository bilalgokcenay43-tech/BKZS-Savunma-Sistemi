import customtkinter as ctk
import time
import random
import datetime
import pandas as pd
from cryptography.fernet import Fernet
from sklearn.ensemble import IsolationForest

class BKZSTamSat(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("🛡️ BKZS Siber Ops & Kriptoloji Merkezi (Master)")
        self.geometry("1100x700")
        ctk.set_appearance_mode("dark")
        
        # 256-Bit AES Kriptografi Anahtarı (Bu simülasyonda her açılışta yenilenir)
        self.encryption_key = Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)
        
        self.current_scenario = "NORMAL"
        
        self.init_ml()
        self.build_ui()
        
        # Ana simülasyon döngüsü (Saniyede bir çalışır)
        self.after(500, self.simulate_feed)
        
    def init_ml(self):
        # Isolation Forest eğitim - Sadece temiz/sağlam veriyle eğitilir ki ufacık sapmaları bile öğrensin.
        # Contamination çok düşük tutulur, çünkü eğitim verimizde "anomali" yok, hepsi normal.
        data = [[random.uniform(38.0, 48.0), random.uniform(10.0, 15.0), random.uniform(0.1, 2.5), random.uniform(1.0, 3.0)] for _ in range(500)]
        self.model = IsolationForest(contamination=0.01, random_state=42)
        self.model.fit(pd.DataFrame(data, columns=["SNR", "AGC", "Pos", "Dop"]))
        
    def build_ui(self):
        self.header = ctk.CTkLabel(self, text="📡 BKZS ÇOK KATMANLI SİBER SAVUNMA AĞI", font=("Consolas", 22, "bold"), text_color="#00FFAA")
        self.header.pack(pady=10)
        
        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # 1. SOL PANÖL: Kriptografi
        self.p_crypto = ctk.CTkFrame(self.main_frame, width=350, fg_color="#0b1016", border_width=1, border_color="#333")
        self.p_crypto.pack(side="left", fill="y", padx=5)
        self.p_crypto.pack_propagate(False) # Genişliği kilitler
        ctk.CTkLabel(self.p_crypto, text="🔒 256-Bit AES Kriptografi", font=("Arial", 14, "bold"), text_color="cyan").pack(pady=10)
        
        self.txt_crypto = ctk.CTkTextbox(self.p_crypto, font=("Consolas", 10), text_color="#00FFFF", fg_color="black", wrap="word")
        self.txt_crypto.pack(fill="both", expand=True, padx=10, pady=10)
        self.txt_crypto.insert("end", "[KRİPTO MODÜLÜ] Beklemede...\nAnahtar: " + self.encryption_key.decode()[:20] + "...\n")
        
        # 2. ORTA PANÖL: ML & Sinyaller
        self.p_radar = ctk.CTkFrame(self.main_frame, width=400, fg_color="#101010", border_width=1, border_color="#333")
        self.p_radar.pack(side="left", fill="both", expand=True, padx=5)
        ctk.CTkLabel(self.p_radar, text="🧠 Yapay Zeka Anomali Analizi", font=("Arial", 14, "bold"), text_color="#00FF00").pack(pady=10)
        
        self.lbl_status = ctk.CTkLabel(self.p_radar, text="DURUM: BAŞLATILIYOR", font=("Consolas", 20, "bold"), text_color="gray")
        self.lbl_status.pack(pady=20)
        
        self.lbl_snr = ctk.CTkLabel(self.p_radar, text="SNR: -- dB", font=("Consolas", 14))
        self.lbl_snr.pack(anchor="w", padx=20, pady=5)
        self.lbl_agc = ctk.CTkLabel(self.p_radar, text="AGC: -- %", font=("Consolas", 14))
        self.lbl_agc.pack(anchor="w", padx=20, pady=5)
        self.lbl_pos = ctk.CTkLabel(self.p_radar, text="Konum Sapması: -- m", font=("Consolas", 14))
        self.lbl_pos.pack(anchor="w", padx=20, pady=5)
        self.lbl_dop = ctk.CTkLabel(self.p_radar, text="Doppler Değişimi: -- Hz", font=("Consolas", 14))
        self.lbl_dop.pack(anchor="w", padx=20, pady=5)
        
        self.txt_radar_log = ctk.CTkTextbox(self.p_radar, height=150, font=("Consolas", 11), text_color="#00FFAA", fg_color="black")
        self.txt_radar_log.pack(fill="both", expand=True, padx=10, pady=10)
        self.txt_radar_log.insert("end", ">>> Isolation Forest Analiz Motoru Devrede...\n")
        
        # 3. SAĞ PANÖL: Kontrol & Honeypot
        self.p_control = ctk.CTkFrame(self.main_frame, width=330, fg_color="#1a1111", border_width=1, border_color="#550000")
        self.p_control.pack(side="right", fill="y", padx=5)
        self.p_control.pack_propagate(False)
        ctk.CTkLabel(self.p_control, text="🎯 Siber Harp Simülatörü", font=("Arial", 14, "bold"), text_color="orange").pack(pady=10)
        
        ctk.CTkButton(self.p_control, text="🟢 Normal GNSS Akışı", fg_color="#1c4728", hover_color="green", command=lambda: self.set_scenario("NORMAL")).pack(pady=10, padx=20, fill="x")
        ctk.CTkButton(self.p_control, text="🟠 Jamming (Gürültü) Saldırısı", fg_color="#9e3e1a", hover_color="orange", command=lambda: self.set_scenario("JAMMING")).pack(pady=10, padx=20, fill="x")
        ctk.CTkButton(self.p_control, text="🟣 Spoofing (Yanıltma) Saldırısı", fg_color="#7b1891", hover_color="purple", command=lambda: self.set_scenario("SPOOFING")).pack(pady=10, padx=20, fill="x")
        
        ctk.CTkLabel(self.p_control, text="🍯 Honeypot (Aldatma) Logları:", font=("Arial", 12)).pack(pady=10)
        self.txt_honeypot = ctk.CTkTextbox(self.p_control, font=("Consolas", 10), text_color="red", fg_color="black")
        self.txt_honeypot.pack(fill="both", expand=True, padx=10, pady=5)

    def set_scenario(self, scen):
        self.current_scenario = scen
        self.txt_radar_log.insert("end", f"\n[=] KOMUTA: Senaryo {scen} olarak değiştirildi.\n")
        self.txt_radar_log.see("end")

    def simulate_feed(self):
        # 1. Ham Veri Üretimi
        if self.current_scenario == "NORMAL":
            snr, agc, pos, dop = random.uniform(38, 48), random.uniform(10, 15), random.uniform(0.1, 2.5), random.uniform(1.0, 3.0)
        elif self.current_scenario == "JAMMING":
            snr, agc, pos, dop = random.uniform(5, 18), random.uniform(40, 65), random.uniform(0, 1.5), random.uniform(1.5, 4.0)
        else: # SPOOFING
            snr, agc, pos, dop = random.uniform(49, 52), random.uniform(10, 12), random.uniform(300, 800), random.uniform(0, 0.2)
            
        raw_string = f"U.{random.randint(10,99)}_SNR_{snr:.1f}_AGC_{agc:.1f}_POS_{pos:.1f}_DOP_{dop:.1f}"
        
        # 2. KRİPTOGRAFİ (Şifreleme) Katmanı
        encrypted_token = self.cipher.encrypt(raw_string.encode())
        self.txt_crypto.insert("end", f"\n[UYDU] Şifreli Paket Alındı:\n{encrypted_token.decode()[:55]}...\n")
        
        # Analize (ML) girmeden hemen önce kendi içimizde deşifre ediyoruz. Saldırgan bu ortada şifreli metni görüyor.
        decrypted_raw = self.cipher.decrypt(encrypted_token).decode()
        self.txt_crypto.insert("end", f"[MERKEZ] Çözüldü: {decrypted_raw}\n{'-'*30}")
        self.txt_crypto.see("end")
        
        # 3. YAPAY ZEKA (ML) ANALİZİ Katmanı 
        df_new = pd.DataFrame([[snr, agc, pos, dop]], columns=["SNR", "AGC", "Pos", "Dop"])
        prediction = self.model.predict(df_new)[0]
        
        self.lbl_snr.configure(text=f"SNR Değeri : {snr:.1f} dB")
        self.lbl_agc.configure(text=f"AGC Değeri : {agc:.1f} %")
        self.lbl_pos.configure(text=f"Konum Atlama: {pos:.1f} m")
        self.lbl_dop.configure(text=f"Doppler Hız : {dop:.1f} Hz")
        
        ts = datetime.datetime.now().strftime('%H:%M:%S')
        
        if prediction == 1:
            # Her şey yolunda
            self.lbl_status.configure(text="SİSTEM: GÜVENLİ ONAYLANDI", text_color="#00FF00")
        else:
            # Anomali Yakalandı! Hedefin sınıflandırması:
            if snr < 25 and agc > 35:
                alarm = "JAMMING SALDIRISI!"
                color = "orange"
                self.trigger_honeypot("KARARTMA / JAMMING")
            elif pos > 100:
                alarm = "SPOOFING SALDIRISI!"
                color = "red"
                self.trigger_honeypot("SAHTEKARLIK / SPOOFING")
            else:
                alarm = "BİLİNMEYEN ANOMALİ"
                color = "yellow"
                
            self.lbl_status.configure(text=f"SİBER ALARM: {alarm}", text_color=color)
            self.txt_radar_log.insert("end", f"[{ts}] ML İKAZ: {alarm} TESPİT EDİLDİ (SNR:{snr:.1f}, POS:{pos:.1f})\n")
            self.txt_radar_log.see("end")
            
        self.after(1500, self.simulate_feed)
        
    def trigger_honeypot(self, attack_type):
        ts = datetime.datetime.now().strftime('%H:%M:%S')
        msg = f"[{ts}] ⚡ {attack_type} TESPİTİ!\nAKTİF ALDATMA (DECEPTION) BAŞLATILDI.\n-> Saldırgana yansıtılan sahte veri:\n"
        
        fake_snr = random.uniform(30, 35)
        fake_pos = random.uniform(1.0, 5.0)
        
        msg += f"   Sahte SNR: {fake_snr:.1f} dB\n   Sahte Konum Sıçraması: {fake_pos:.1f}m\n"
        
        if "SPOOFING" in attack_type:
            # Gerçekte disk e sahte dosya dökebilir.
            pd.DataFrame({'Sahte_Enlem': [41.011], 'Sahte_Boylam': [28.981]}).to_csv("BKZS_Honeypot_Veri.csv")
            msg += "-> Düşmana Yem Veri Dosyası Dağıtıldı (BKZS_Honeypot.csv)\n"
            
        self.txt_honeypot.insert("end", msg + "-"*35 + "\n")
        self.txt_honeypot.see("end")

if __name__ == "__main__":
    app = BKZSTamSat()
    app.mainloop()
