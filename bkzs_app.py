import customtkinter as ctk
import os
import socket
import time
import datetime
import requests # Eğer hata verirse terminale: pip install requests
import pandas as pd
import random

# --- KİŞİSEL AYARLARIN ---
HEDEF_PC_ISMI = "KULLANICI_ADI"  # Bilgisayarın kullanıcı adı (Anonimleştirildi)
HEDEF_SEHIR = "SEHIR_MERKEZI"   # Bulunduğun şehir (Anonimleştirildi)
CALISMA_SAATLERI = (8, 23)      # Normal çalışma saatlerin
DOGRULAMA_METNI = "BKZS-PROTOTIP-2026"
HIZ_ESIGI = 0.7                 # Yazım hızı limiti

class BKZSSavunmaSistemi(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("BKZS Siber Güvenlik ve Anomali Tespit Prototipi")
        self.geometry("550x700")
        
        # Başlık Bölümü
        self.main_label = ctk.CTkLabel(self, text="🛡️ BKZS GÜVENLİK TERMİNALİ", font=("Arial", 24, "bold"))
        self.main_label.pack(pady=20)

        # Analiz ve Log Ekranı (Siyah Kutu)
        self.log_box = ctk.CTkTextbox(self, height=250, width=480, font=("Consolas", 12), text_color="#00FF00")
        self.log_box.pack(pady=10)
        self.log_box.insert("0.0", ">>> SİSTEM BAŞLATILDI. DOĞRULAMA BEKLENİYOR...\n" + "="*45 + "\n")

        # Giriş Talimatı
        self.instr = ctk.CTkLabel(self, text=f"Lütfen Onaylayın: {DOGRULAMA_METNI}", text_color="gray")
        self.instr.pack(pady=5)
        
        # Giriş Kutusu
        self.entry = ctk.CTkEntry(self, placeholder_text="Metni buraya giriniz...", width=350, height=40)
        self.entry.pack(pady=15)
        self.entry.bind("<KeyPress>", self.zaman_tetikle)

        # Analiz Butonu
        self.btn = ctk.CTkButton(self, text="ERİŞİMİ ANALİZ ET VE DOĞRULA", command=self.guvenlik_zinciri, 
                                 fg_color="#1f538d", hover_color="#14375e", height=45, font=("Arial", 14, "bold"))
        self.btn.pack(pady=20)

        self.start_time = None

    def zaman_tetikle(self, event):
        if self.start_time is None: 
            self.start_time = time.time()

    def guvenlik_zinciri(self):
        # Ekranı temizle ve analizi başlat
        self.log_box.delete("3.0", "end")
        self.log_box.insert("end", "\n[!] ANALİZ BAŞLATILDI...\n")
        self.update() # Arayüzü tazele
        
        anomali_skoru = 0 # 0 ise güvenli, arttıkça riskli

        # --- 1. KATMAN: CİHAZ KİMLİĞİ ---
        su_an_pc = os.getlogin()
        if su_an_pc == HEDEF_PC_ISMI:
            self.log_box.insert("end", f"✓ Cihaz Doğrulandı: {su_an_pc}\n")
        else:
            self.log_box.insert("end", f"X YETKİSİZ CİHAZ: {su_an_pc}\n", "red")
            anomali_skoru += 1

        # --- 2. KATMAN: DIŞ IP VE KONUM (SENİN İSTEDİĞİN KISIM) ---
        try:
            # IP ve Konum bilgilerini tek bir servisten çekiyoruz
            servis = requests.get('https://ipapi.co/json/', timeout=5).json()
            su_an_ip = servis.get('ip', 'Bilinmiyor')
            su_an_sehir = servis.get('city', 'Bilinmiyor')
            saglayici = servis.get('org', 'Bilinmiyor')

            self.log_box.insert("end", f"🌐 Dış IP Adresiniz: {su_an_ip}\n")
            self.log_box.insert("end", f"📍 Tespit Edilen Konum: {su_an_sehir}\n")
            self.log_box.insert("end", f"🏢 Sağlayıcı: {saglayici}\n")

            if su_an_sehir == HEDEF_SEHIR:
                self.log_box.insert("end", "✓ Coğrafi Konum Onaylandı.\n")
            else:
                self.log_box.insert("end", f"X KONUM HATASI: Beklenen {HEDEF_SEHIR}\n")
                anomali_skoru += 1
        except:
            self.log_box.insert("end", "X AĞ HATASI: IP ve Konum bilgisi alınamadı!\n")
            anomali_skoru += 1

        # --- 3. KATMAN: ZAMANSAL ANALİZ ---
        saat = datetime.datetime.now().hour
        if CALISMA_SAATLERI[0] <= saat <= CALISMA_SAATLERI[1]:
            self.log_box.insert("end", f"✓ Erişim Saati Uygun: {saat}:00\n")
        else:
            self.log_box.insert("end", f"X ZAMANSAL ANOMALİ: Gece erişimi!\n")
            anomali_skoru += 1

        # --- 4. KATMAN: YAZIM BİYOMETRİSİ ---
        metin = self.entry.get()
        sure = time.time() - self.start_time if self.start_time else 0
        hiz = sure / len(metin) if len(metin) > 0 else 999
        
        if metin == DOGRULAMA_METNI and hiz < HIZ_ESIGI:
            self.log_box.insert("end", f"✓ Yazım Hızı Doğrulandı: {hiz:.2f} s/h\n")
        else:
            self.log_box.insert("end", f"X YAZIM ANOMALİSİ (Hız: {hiz:.2f})\n")
            anomali_skoru += 1

        # --- FİNAL KARARI ---
        if anomali_skoru == 0:
            self.log_box.insert("end", "\n" + "="*45 + "\n✅ ERİŞİM ONAYLANDI. SİSTEM AKTİF.")
            self.btn.configure(fg_color="green", text="GİRİŞ BAŞARILI")
        else:
            self.log_box.insert("end", "\n" + "="*45 + "\n⚠️ ANOMALİ TESPİT EDİLDİ! ERİŞİM ENGELLENDİ.")
            self.btn.configure(fg_color="red", text="ERİŞİM REDDEDİLDİ")
            self.sahte_veri_firlat(su_an_pc)

    def sahte_veri_firlat(self, pc):
        # Saldırganı meşgul etmek için arka planda sahte veri üretir
        df = pd.DataFrame({
            'Zaman': [datetime.datetime.now()],
            'Sinyal': [random.randint(-120, -90)],
            'Durum': ['Saldırı Tespit Edildi']
        })
        df.to_csv("BKZS_Sistem_Koruma_Raporu.csv", index=False)

if __name__ == "__main__":
    app = BKZSSavunmaSistemi()
    app.mainloop()
