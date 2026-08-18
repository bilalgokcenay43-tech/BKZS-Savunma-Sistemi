import customtkinter as ctk
import random
import time
import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# ==========================================
# BKZS ML Tabanlı Sinyal Anomali Analiz Prototipi
# ==========================================

class SignalMonitorApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("BKZS Anomali Tespit & Sinyal Analiz Merkezi")
        self.geometry("900x700")
        ctk.set_appearance_mode("dark")
        
        self.current_mode = "NORMAL"
        
        self.setup_ui()
        self.init_ml_model()
        
        # Sinyal simulasyon dongusu baslat (her 1.5 saniyede)
        self.update_signals()

    def init_ml_model(self):
        self.log_message(">>> [SYSTEM] Makine Öğrenmesi Modeli (Isolation Forest) başlatılıyor...")
        
        # 1000 adet NORMAL (sağlıklı) veri noktası üretip modeli eğitiyoruz.
        # Kolonlar: [SNR, AGC, Delta_Pos, Doppler_Var]
        training_data = []
        for _ in range(1000):
            snr = random.uniform(38.0, 48.0)
            agc = random.uniform(10.0, 15.0)
            delta_pos = random.uniform(0.1, 2.5) # Metre/saniye
            doppler = random.uniform(1.0, 3.0)   # Doğal dalgalanma
            training_data.append([snr, agc, delta_pos, doppler])
            
        df = pd.DataFrame(training_data, columns=["SNR", "AGC", "Delta_Pos", "Doppler_Var"])
        self.model = IsolationForest(contamination=0.03, random_state=42)
        self.model.fit(df)
        
        self.log_message(">>> [SYSTEM] Model 1000 simüle edilmiş normal veri ile eğitildi. 'Normal' şablon hazır!\n")

    def setup_ui(self):
        # Üst Başlık
        self.header = ctk.CTkLabel(self, text="📡 BKZS ML-TABANLI ANOMALİ TESPİT SİSTEMİ", font=("Consolas", 24, "bold"), text_color="#00FFCC")
        self.header.pack(pady=15)
        
        # Ana Çerçeve (Orta Kısım)
        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.pack(fill="x", padx=20, pady=10)
        
        # --- Sol Panel (Durum ve Değerler) ---
        self.left_panel = ctk.CTkFrame(self.main_frame, width=450, fg_color="#101010", border_width=1, border_color="#555")
        self.left_panel.pack(side="left", fill="y", expand=True, padx=5)
        
        self.status_label = ctk.CTkLabel(self.left_panel, text="DURUM: GÜVENLİ ONAYLANDI", font=("Arial", 20, "bold"), text_color="#00FF00")
        self.status_label.pack(pady=20)
        
        # Değer Göstergeleri (Metin tabanlı)
        self.snr_var = ctk.StringVar(value="SNR (Signal/Noise): -- dB-Hz")
        self.agc_var = ctk.StringVar(value="AGC (Auto Gain): -- %")
        self.pos_var = ctk.StringVar(value="Delta Konum Sıçraması: -- m/s")
        self.dop_var = ctk.StringVar(value="Doppler Dalgalanması: -- Hz/s")
        
        ctk.CTkLabel(self.left_panel, textvariable=self.snr_var, font=("Consolas", 14)).pack(anchor="w", padx=20, pady=5)
        ctk.CTkLabel(self.left_panel, textvariable=self.agc_var, font=("Consolas", 14)).pack(anchor="w", padx=20, pady=5)
        ctk.CTkLabel(self.left_panel, textvariable=self.pos_var, font=("Consolas", 14)).pack(anchor="w", padx=20, pady=5)
        ctk.CTkLabel(self.left_panel, textvariable=self.dop_var, font=("Consolas", 14)).pack(anchor="w", padx=20, pady=5)
        
        # --- Sağ Panel (Saldırı Simülatörü Butonları) ---
        self.right_panel = ctk.CTkFrame(self.main_frame, width=350, fg_color="#101010")
        self.right_panel.pack(side="right", fill="y", expand=True, padx=5)
        
        ctk.CTkLabel(self.right_panel, text="⚡ SALDIRI SİMÜLATÖRÜ", font=("Consolas", 16, "bold")).pack(pady=15)
        
        self.btn_normal = ctk.CTkButton(self.right_panel, text="🌿 NORMAL SEYİR (Güvenli)", fg_color="#1c4728", hover_color="#2b703e", 
                                        command=lambda: self.set_mode("NORMAL"))
        self.btn_normal.pack(pady=10, fill="x", padx=20)
        
        self.btn_jamming = ctk.CTkButton(self.right_panel, text="📻 JAMMING (Karıştırma) SALDIRISI", fg_color="#6e2d14", hover_color="#9e3e1a", 
                                         command=lambda: self.set_mode("JAMMING"))
        self.btn_jamming.pack(pady=10, fill="x", padx=20)
        
        self.btn_spoofing = ctk.CTkButton(self.right_panel, text="📡 SPOOFING (Yanıltma) SALDIRISI", fg_color="#521061", hover_color="#7b1891", 
                                          command=lambda: self.set_mode("SPOOFING"))
        self.btn_spoofing.pack(pady=10, fill="x", padx=20)
        
        # Alt Panel (Termİnal / Log)
        self.log_box = ctk.CTkTextbox(self, height=200, font=("Consolas", 12), text_color="#00FF00", fg_color="black")
        self.log_box.pack(pady=20, padx=20, fill="both", expand=True)

    def set_mode(self, mode):
        self.current_mode = mode
        self.log_message(f"--- [OPERATÖR] Yeni Mod Ayarlandı: {mode} ---")

    def generate_telemetry(self):
        # Seçilen moda göre sentetik GNSS sinyal verisi üretiyoruz
        if self.current_mode == "NORMAL":
            snr = random.uniform(38.0, 48.0)
            agc = random.uniform(10.0, 15.0)
            pos = random.uniform(0.1, 2.5) # Yaya/Araç normal hareketi
            dop = random.uniform(1.0, 3.0) 
        elif self.current_mode == "JAMMING":
            # Jamming: Karıştırıcı gürültü basar. Sinyal kalitesi çakılır, AGC artar.
            snr = random.uniform(5.0, 18.0) 
            agc = random.uniform(40.0, 65.0)
            pos = random.uniform(0.0, 1.5) # Bağlantı kopuyor/kopmak üzere
            dop = random.uniform(1.5, 4.0) 
        elif self.current_mode == "SPOOFING":
            # Spoofing: Cihazı başka yere ışınlayan sahte ama güçlü sinyal.
            snr = random.uniform(49.0, 52.0) # Sahte sinyal çok mükemmel ve kayıpsızdır
            agc = random.uniform(10.0, 12.0)
            pos = random.uniform(300.0, 800.0) # Aniden 500m zıplama! (İmkansız yer değişimi)
            dop = random.uniform(0.0, 0.2) # Doppler fazla stabil (Doğal değil)
            
        return [snr, agc, pos, dop]

    def update_signals(self):
        # 1. Yeni veri üret
        snr, agc, pos, dop = self.generate_telemetry()
        
        # 2. Arayüz metinlerini güncelle
        self.snr_var.set(f"SNR (Sinyal Gücü): {snr:.1f} dB-Hz")
        self.agc_var.set(f"AGC (Sinyal Kazanç): {agc:.1f} %")
        self.pos_var.set(f"Konum Zıplaması: {pos:.1f} m/s")
        self.dop_var.set(f"Doppler Pürüzü: {dop:.2f} Hz/s")
        
        # 3. Makine Öğrenmesi (Isolation Forest) Tahmini
        # predict() -> 1 (Normal), -1 (Anomali)
        df_new = pd.DataFrame([[snr, agc, pos, dop]], columns=["SNR", "AGC", "Delta_Pos", "Doppler_Var"])
        prediction = self.model.predict(df_new)[0]
        
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        
        if prediction == 1:
            # NORMAL
            self.status_label.configure(text="DURUM: GÜVENLİ (YEŞİL ALARM)", text_color="#00FF00")
            self.log_message(f"[{ts}] ML-ANALİZ: Uyumlu. SNR:{snr:.1f} Doğrulanmış Telemetri.")
        else:
            # ANOMALİ TESPİT EDİLDİ! Ek sınıflandırma yapıyoruz
            if snr < 25 and agc > 35:
                alarm_tetik = "⚠️ KARŞI TEDBİR: JAMMING SALDIRISI TESPİT EDİLDİ! (Geniş Bant Karıştırması)"
                color = "orange"
            elif pos > 100 or dop < 0.5:
                alarm_tetik = "🚨 TEHLİKE: SPOOFING (YANILTMA) TESPİT EDİLDİ! (Yapay Konum/Sinyal Sıçraması)"
                color = "red"
            else:
                alarm_tetik = "⚠️ İKAZ: Tanımlanamayan Anomali Saptandı."
                color = "yellow"
                
            self.status_label.configure(text=f"DURUM: {alarm_tetik.split(':')[0]}", text_color=color)
            self.log_message(f"[{ts}] {alarm_tetik} | Değerler: SNR={snr:.1f}, Pos={pos:.1f}", color=color)

        # Kendini tekrarla
        self.after(1500, self.update_signals)

    def log_message(self, msg, color="#00FF00"):
        self.log_box.insert("end", msg + "\n")
        # En alta otomatik kaydır
        self.log_box.see("end")

if __name__ == "__main__":
    app = SignalMonitorApp()
    app.mainloop()
