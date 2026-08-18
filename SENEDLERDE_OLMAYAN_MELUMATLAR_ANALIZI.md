# Sənədlərdə Olmayan və Sistemdə İstifadə Edilən Məlumatların Analizi

Bu sənəd təqdim edilən 11 rəsmi gömrük, liman və daşıma sənədlərinin (**Gəmi Manifesti, Bill of Lading, CMR Beynəlxalq Qaimələr, Gömrük Bəyannamələri və İnvoys**) əsasında hazırlanmışdır. 

Məqsəd: Sistemdə (səhifələrdə, cədvəllərdə, formalarda və kartlarda) istifadə olunan, lakin **bu sənədlərdən gəlməyən (gəlməyəcək)** məlumatların tam inventarını çıxarmaq və sizin təsdiqinizlə onları təmizləmək / sadələşdirməkdir.

---

## 1. Əlimizdə Olan Real Sənədlərin Faktiki Sahələri (Gələn Məlumatlar)

| Sənəd Növü | Sənədin Nömrəsi | Sənəddəki Dəqiq Sahələr |
|---|---|---|
| **Dəniz Konosamenti (Bill of Lading)** | `BL-637` | Gəmi: *«Альфа Меркурий»*, Bayraq: *Rusiya*, Sahibi: *LLC "ALPHA"*, Kapitan, Ekspeditor: *Pace North Co Inc.*, Yükləmə limanı: *Türkmənbaşı*, Boşaltma limanı: *Ələt / Zirə*, Son təyinat: *BƏƏ (Dubay)*, Yük: *Dənəvər kükürd*, Çəki: *207.322 MTS*, Daşıma qeydi: *Clean on board / Freight prepaid*, B/L nüsxə: *5 nüsxə*. |
| **Gəmi Manifesti** | `MNF-637` | Səhifə 1 manifest məlumatları, B/L № 637, Türkmənistan DGX möhürü (*Göýbermäge Rugsat Berildi · TDSG №15*). |
| **CMR Qaimələri** | `DA 1604513`<br>`DA 1605826`<br>`26KR0220` | Nəqliyyat qeydiyyat nömrələri (*1234 BNF/2528 TBN*, *DG8068AG/AG4728TR*, *368 CO-02/99 YK 437*), Sürücülər (*Balkanow G., Takow S., Əhməd Q.*), Yüklər (*Karbamid, Konfetlər, Profil/gipskarton*), Netto/Brutto çəkilər, Göndərən, Alıcı, Çatdırılma yeri, İnvoys istinadları. |
| **Gömrük Bəyannamələri (İD 80)** | `01263000224935`<br>`01263000224864`<br>`01263000221427` | Sorğu № və Tarix, Bəyannamə tipi (*İD 80*), Göndərən və Qəbul edən, Bəyannaməçi broker (*Azərterminalkompleks, Trans Gate*), Operator və Attestat №, Nəqliyyat nömrələri (*52AEJ596/52ACY559*, *234EK02/57JRA02*, *BRST6622/KAEX1426*), İnvoys dəyəri və valyuta, Məzənnə, Gömrük dəyəri (AZN), Statistik dəyər, Sərhəd G/P (*00204 Qırmızı körpü, 00502 Mazımqara*), Təyinat G/P (*13005 Beynəlxalq Dəniz Ticarət Limanı*), Malın adı və HS kodu, Netto/Brutto, Ödənişlər (*01, 20, 32, 75, 85*). |
| **Kommersiya İnvoysu** | `№ 2026/07E` | Satıcı (*Sahibkar Başımov Erkin*), Alıcı (*Best Company 2004 Ltd*), Bank və SWIFT rekvizitləri, Mal siyahısı (*Karamellər*), Dəyər (*3,960.00 USD*), Nəqliyyat (*DG8068AG*). |

---

## 2. Səhifələr Üzrə Sənədlərdə OLMAYAN Sahələrin Siyahısı

Aşağıdakı bölmələrdə sistemin müxtəlif səhifələrində göstərilən, lakin yuxarıdakı sənədlərdən **gəlməyən** məlumatlar qeyd olunub:

---

### A. Gəmi Əməliyyatları və Xəritə Səhifəsi (`src/pages/Ships.tsx`, `src/components/SeaMap.tsx`)

| Sahə / Parametr | Cari Vəziyyət | Sənəddə Vəziyyəti | Təklif Olunan Qərar |
|---|---|---|---|
| **1. Canlı Sürət (SOG - knot)** | Cədvəldə və xəritədə `12.4 düyün`, `3.1 düyün` kimi göstərilir | Sənəddə sürət parametri **yoxdur** (yalnız Yola çıxma və Çatma tarixi var) | 🔘 **Təmizlənsin** və ya yalnız statik marşrut vaxtı göstərilsin |
| **2. Kompas Kursu (COG - dərəcə)** | `074° (Şimal-Şərq)`, `254° (Cənub-Qərb)` | Sənəddə kompas bucağı **yoxdur** | 🔘 **Təmizlənsin** |
| **3. Canlı GPS Koordinatları (Lat/Lng)** | `40.12° N, 49.96° E` dəqiq koordinatlar | Sənəddə yalnız Yükləmə limanı (*Türkmənbaşı/Kurık*) və Boşaltma limanı (*Ələt*) var | 🔘 Liman adları əsasında sabit xəritə nöqtəsi kimi saxlanılsın |
| **4. AIS Transponder Sinfi (Class A/B)** | `Aktiv · Class A` | Gömrük/Liman sənədində transponder növü **yoxdur** | 🔘 **Təmizlənsin** |
| **5. Port Call Riyazi Risk Skoru** | `Risk: 39`, `Risk: 12` | Gömrük sənədlərində belə bir bal sistemi **yoxdur** | 🔘 **Təmizlənsin**, yalnız rəsmi status (*Təsdiqləndi / Yoxlama*) saxlanılsın |
| **6. Ekipaj və Sərnişin Sayı** | `25 ekipaj / 0 sərnişin` | Dəniz manifestində yalnız *Master of the ship* (Kapitan) adı var, ümumi say qeyd olunmur | 🔘 **Təmizlənsin** (yalnız Kapitan və Ekspeditor adı qalsın) |

---

### B. Vahid Qeydiyyat Səhifəsi (`src/pages/Registration.tsx`)

| Sahə / Parametr | Cari Vəziyyət | Sənəddə Vəziyyəti | Təklif Olunan Qərar |
|---|---|---|---|
| **1. Yol Vergisi Hesablanması (Vergi Məcəlləsi 211.1.1.3)** | Qalma müddəti (`1 gün`, `2 həftə`, `1 ay`, `1 il`) və Ox sinfi (`≤4 ox`, `>4 ox`) seçilərək USD hesablanır | Təqdim edilən Gömrük Bəyannaməsi və CMR-də yol vergisi maddəsi **yoxdur** (yalnız 01, 20, 32, 75, 85 gömrük ödənişləri var) | ❓ **Qalsın, yoxsa təmizlənsin?** (Əgər bu formanı inspektor özü əl ilə doldurursa saxlanıla bilər, sənəddən avtomatik oxunmursa gizlədilə və ya könüllü edilə bilər) |
| **2. Nəqliyyat İcazə Blankları (Dropdown)** | `İcazə Blankı`, `BNF jurnalı`, `TİR Carnet` seçimləri | Bəyannamədə 2015, 4041, 8001 sənədləri qeyd olunur, ayrıca icazə blankı dropdown-ı **yoxdur** | ❓ **Qalsın, yoxsa sadələşdirilsin?** |
| **3. Avtomatik Risk Açar Sözləri və Əlavə Yoxlama Kanalları** | Proqram yükün adına görə avtomatik `Fiziki yoxlama`, `X ray`, `Kinoloji it` seçir | Sənəddə risk kanalı avtomatik deyil, gömrük orqanının qərarı ilə müəyyən edilir | 🔘 İnspektorun əl ilə seçim düymələri kimi saxlanılsın |

---

### C. Gömrük Bəyannamələri Modulu (`src/pages/Declarations.tsx`, `src/components/DeclarationDocumentView.tsx`)

| Sahə / Parametr | Cari Vəziyyət | Sənəddə Vəziyyəti | Təklif Olunan Qərar |
|---|---|---|---|
| **1. Canlı Valyuta Məzənnələri Paneli (`fx-rate-line`)** | Səhifənin yuxarısında USD, EUR, GBP, TRY, RUB, CNY canlı məzənnə lenti fırlanır | Real gömrük bəyannamələrində məzənnə canlı deyil, bəyannamə təsdiqlənən günün rəsmi məzənnəsi (`1$ = 1.7000 AZN`, `1€ = 1.9615 AZN`, `1 KZT = 0.3670 AZN`) sənəd daxilində sabit yazılır | 🔘 **Canlı məzənnə lenti təmizlənsin**, bəyannamənin öz daxilindəki rəsmi məzənnə qalsın |
| **2. Bəyannamənin Boş Qalan Qrafaları** | Çatdırılma şərtləri (Incoterms), Sövdələşmə xarakteri, Bank rekvizitləri, S.İ.Ö., Qoşma vərəq | Təqdim edilən rəsmi İD 80 bəyannamələrində bu xanalar rəsmi olaraq **boşdur** | 🔘 Formada xəta verməməsi üçün defolt boş və ya gizli saxlanılsın |

---

### D. İdarəetmə Paneli (Dashboard) və Analitika (`src/pages/Dashboard.tsx`, `src/pages/Analytics.tsx`)

| Sahə / Parametr | Cari Vəziyyət | Sənəddə Vəziyyəti | Təklif Olunan Qərar |
|---|---|---|---|
| **1. İllik 12 Aylıq Qrafiklər (Yan–Dek)** | Bütün 12 ay üzrə gəmi, tonaj və avtomobil statistikası | Əlimizdəki sənədlər yalnız **İyul və Avqust 2026** reyslərinə aiddir | 🔘 Cari dövr (İyul–Avqust) üzrə fokuslansın |
| **2. Gəmilərin Avtomatik "Gələn/Gedən" Axın Bölgüsü** | Sistem gəmiləri avtomatik Gələn/Gedən kimi ayırır | Sənədlərdə hər gəminin konkret bir reysi var (Məsələn: *Türkmənbaşı → Ələt → Dubay*) | 🔘 Reys marşrutu (*Çıxış → Giriş*) kimi dəqiq göstərilsin |

---

## 3. Növbəti Addımlar və Sizin Qərarınız

Bu siyahı əsasında hansı sahələrin dərhal təmizlənməsini istəyirsiniz?

1. **Gəmi detallarında və xəritədə**: Sürət, kompas dərəcəsi, Class A transponder və ekipaj sayını təmizləyəkmi?
2. **Bəyannamə pəncərəsində**: Canlı valyuta lentini yığışdırıb, yalnız sənədin öz rəsmi məzənnəsini saxlayaqmı?
3. **Qeydiyyat pəncərəsində**: Yol vergisi kalkulyatoru və İcazə blankı bölmələrini necə tənzimləyək?
