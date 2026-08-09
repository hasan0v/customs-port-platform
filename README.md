# Customs and Port Operations Platform

A unified customs and port operations prototype with live maps, risk workflows, analytics, and responsive Azerbaijani UI.

| Field | Value |
| --- | --- |
| Focus | Operations and data visualization |
| Status | Active portfolio project |

**Engineering notes:** [System design](docs/ENGINEERING.md) · [Security](SECURITY.md) · [Live demo](https://liman-demo.vercel.app) · [Quality workflow](.github/workflows/quality.yml)

## Overview

A unified customs and port operations prototype with live maps, risk workflows, analytics, and responsive Azerbaijani UI.

## Project details

Ələt Beynəlxalq Dəniz Ticarət Limanı ilə Azərbaycan gömrük sisteminin koordinasiyalı işini vizual şəkildə göstərən rəhbərlik təqdimatı üçün prototipdir. Layihənin əsas ideyası gəmi qeydiyyatı, avtomobilin gəmi manifestinə bağlanması və mal bəyannaməsinin əlavə edilməsi proseslərini üç ayrı səhifədən bir vahid əməliyyat ekranına çevirməkdir.

Prototip 2026-cı ilə aid tam sintetik məlumatlardan istifadə edir. Heç bir real gömrük və ya şəxsi məlumat saxlanılmır.

## Tamamlanmış funksiyalar

- Azərbaycan dilində tam adaptiv idarəetmə paneli
- 390, 768, 1024 və 1440 px ekranlar üçün ayrıca yoxlanmış responsive layout və sıfır body overflow
- Mobil cihazlarda 2×2 KPI düzülüşü, kompakt cinematic hero, böyüdülmüş touch target-lər və oxunaqlı əməliyyat mətnləri
- Cədvəllər üçün mobil horizontal scroll affordance, optimallaşdırılmış Leaflet control-ları və tam-enli qeydiyyat action-ları
- VAİS və Maritime Single Window ekranlarından modelləşdirilmiş “Əməliyyat komandası”
- Port çağırışları, ETA/ETD, risk balı və beş dövlət qurumu üzrə elektron icazə matrisi
- Gömrük bəyannaməsi, yük manifesti, invoys və CMR üçün normallaşdırılmış sənəd modeli
- Open-Meteo-dan Ələt üzrə canlı hava və açıq API-dən internet valyuta məzənnəsi
- Yığılan glassmorphism yan menyu və mobil menyu
- AIS əsaslı sintetik canlı gəmi xəritəsi: Ələt, Kurık, Aktau və Türkmənbaşı
- Gəmi, avtomobil və GİB üzrə `Cmd/Ctrl + K` sürətli axtarış
- Gəmi → avtomobil → bəyannamə → post qərarı vahid qeydiyyat axını
- 13 rəqəmli avtomobil kodu və nömrə ilə manifest axtarışı
- “Bill of” əlaqəsinin avtomatik yaradılmasının vizual nümayişi
- Konfeti, toast bildirişləri, count-up və Framer Motion animasiyaları
- SVG, CSS 3D perspective və radar qatları ilə cinematic gəmi vizualları
- Dashboard, əməliyyat detalı, AIS xəritə modalı və gəmi modalında təkrar istifadə olunan `ShipScene3D`
- `prefers-reduced-motion` dəstəyi ilə əlçatan motion sistemi
- Bəyannamə cədvəli, HS kodları və ətraflı modal
- Post qərarları tarixçəsi, CSV ixracı və çap/PDF görünüşü
- Recharts ilə trafik, yük, liman payı və səmərəlilik analitikası
- React Joyride tur kodu sonrakı mərhələ üçün saxlanılıb, UI stabilləşdirilməsi dövründə müvəqqəti deaktivdir
- İşıqlı və qaranlıq mövzu
- Playwright avtomatik screenshot skripti
- Vercel və Cloudflare Pages üçün SPA yönləndirmələri

## Funksional ünvanlar

| Ünvan | Təyinat |
|---|---|
| `/` | Əməliyyat mərkəzi, statistika, canlı xəritə və fəaliyyət axını |
| `/emeliyyatlar` | VAİS + MSW canlı növbə, qurum icazələri, risk və sənəd intellekti |
| `/gemiler` | AIS radar, gəmi cədvəli, filter və gəmi detalları |
| `/qeydiyyat` | Əsas vahid qeydiyyat demosu |
| `/beyannameler` | Elektron GİB idarəetməsi və mal detalları |
| `/tarixce` | Post qərarları, audit timeline, CSV/PDF |
| `/analitika` | Trafik, yük və proses səmərəliliyi qrafikləri |
| `/parametrler` | Profil, bildiriş, inteqrasiya və təhlükəsizlik parametrləri |

## Texniki stack

- React 18, TypeScript, Vite
- TailwindCSS 3 və xüsusi komponent dizayn sistemi
- Framer Motion, Lucide React, Zustand, Sonner
- Leaflet və React Leaflet
- Recharts, React CountUp, Canvas Confetti
- React Joyride (müvəqqəti deaktiv)
- Playwright

## Data arxitekturası

Demo və əməliyyat məlumatları iki qatda təşkil olunub:

- `src/data/mockData.ts`: 12 sintetik gəmi, 36 avtomobil, 24 bəyannamə, 18 post qərarı və analitika.
- `src/data/operationalData.ts`: şəkillərdəki VAİS/MSW strukturlarından normallaşdırılmış port çağırışı, qurum icazəsi və gömrük sənədi modeli.
- `src/services/liveData.ts`: Open-Meteo hava API-si və açıq valyuta API-si üçün timeout və xəta idarəetməli internet data qatı.
- UN/LOCODE 2025-1 liman kodları məlumat modelinin istinad mənbəyidir.

Şəkillərdəki sənəd tipləri vahid sxemə gətirilib: `PortCall`, `AgencyClearance` və `CargoDocument`. Buraya gəmi/IMO/MMSI, səfər, ETA/ETD, ekipaj, sərnişin, yük, avtomobil, göndərən/alıcı, HS kodu, bağlama sayı, xalis/ümumi çəki, valyuta və sənəd statusu daxildir.

Bu versiyada əməliyyat qeydləri demo modeldir və daimi yaddaş yoxdur. Real istehsal mərhələsində Dövlət SSO/RBAC, rəsmi VAİS/MSW API icazəsi və audit üçün Cloudflare D1 və ya təşkilatın mövcud verilənlər bazası tələb olunur. Kommersiya AIS məlumatı açıq API kimi təqdim edilmədiyinə görə real AIS mövqeləri üçün ayrıca provayder müqaviləsi lazımdır.

## Quraşdırma və işə salma

```bash
npm install
npm run dev
```

İstehsal build-i:

```bash
npm run build
npm run preview
```

Brauzer ünvanı: `http://localhost:3000`

## Screenshotların hazırlanması

Əvvəlcə preview serverini işə salın, sonra başqa terminalda:

```bash
npm run screenshot
```

Nəticələr `screenshots/` qovluğunda saxlanılır.

## İstifadə qaydası

1. `Əməliyyat komandası` səhifəsində port çağırışlarını, canlı Ələt havasını, məzənnəni və qurum təsdiqlərini izləyin.
2. Cədvəldən gəmi seçərək marşrut, ekipaj, yük, risk və elektron icazə matrisini açın.
3. Sənəd intellekti bölməsində manifest, invoys, CMR və gömrük bəyannaməsinin əlaqəsini yoxlayın.
4. `Vahid qeydiyyat` səhifəsində gəmi seçin.
5. Demo üçün `15 AA 859` avtomobil nömrəsini axtarın.
6. Sistem avtomobili liman manifestindən tapıb gəmiyə bağlayacaq.
7. Aktiv GİB-i seçin və `Yoxla və təsdiq et` düyməsini basın.
8. İnteraktiv səhifə turu hazırkı UI stabilləşdirmə versiyasında müvəqqəti deaktivdir.

## Hələ real sistemdə tələb olunan işlər

- Liman Vahid Pəncərəsi üçün API icazəsi və sənədləşməsi
- AIS provayderi ilə kommersiya məlumat müqaviləsi
- Gömrük GİB və post qərar API inteqrasiyası
- Dövlət SSO/RBAC və elektron imza
- Audit jurnalının D1 və ya təşkilatın mövcud verilənlər bazasında saxlanması
- Penetrasiya testi, hüquqi uyğunluq və istehsal monitorinqi

## Tövsiyə olunan növbəti addımlar

1. Limandan manifest, gəmi, yük və avtomobil sahələrinin nümunə strukturunu almaq.
2. Gömrük və liman sistemləri arasında vahid məlumat xəritəsi hazırlamaq.
3. Məhdud istifadəçi qrupu ilə Ələt limanında pilot sınaq aparmaq.
4. Orta emal müddəti, təkrar daxil etmə sayı və səhv faizini pilot KPI kimi ölçmək.

## Deployment

- Platformalar: Vercel və Cloudflare Pages uyğun
- Build qovluğu: `dist`
- Framework preset: Vite
- Status: Lokal prototip hazırdır; MSW/VAİS ekranları, cinematic 3D gəmi vizualları, responsive modallar və mobil/tablet səhifələr 390/768/1024/1440 px Playwright auditindən sıfır body overflow və sıfır console xətası ilə keçib; istehsala yerləşdirilməyib
- Son yenilənmə: 10 iyul 2026

## Repository

```bash
git clone https://github.com/hasan0v/customs-port-platform.git
cd customs-port-platform
```

## Status

Active portfolio project.
