# Architecture Note — Customs & Port Operations Platform

## 1. Məqsəd və konteks

Bu layihə Azərbaycan liman-gömrük ekosistemində operativ idarəetmə üçün yaradılmış interfeys prototipidir. Əsas məqsəd odur ki, ayrı-ayrı proseslər — gəmi, manifest, avtomobil, gömrük bəyannaməsi, risk təhlili, icazə və post qərarı — vahid iş axını şəklində bir platforma birləşdirilsin.

Layihə real istehsal sistemi deyil; bu, product concept və UX prototype-dir. Buna görə data sintetikdir, backend yoxdur, API inteqrasiyası tam deyil. Lakin arxitektura, state flow, component boundaries və product logic real biznes kontekstini təqlid edən dərəcədə düşünülüb.

---

## 2. Problem statement

Liman və gömrük operasyonlarında aşağıdakı problemlər tez-tez yaranır:

- informasiya ayrı sahələrdə yerləşir
- eyni obyektin statusu müxtəlif idarəetmə panellərində çox vaxt çətin görünür
- risk və qərar prosesi bir sistemdə konsentrasiyalanmır
- operativ rəhbərlik tam context əldə etmir
- mobil və desktop üçün vahid iş axını qorunmur

Bu layihənin əsas biznes missiyası budur:

> Eyni əməliyyat kontekstini müxtəlif rol və istifadəçi növləri üçün bir ekranda, vahid, vizual və anlaşılır formada təqdim etmək.

---

## 3. System boundary

Layihənin həddi aşağıdakılardır:

- frontend-only prototype
- synthetic data model
- client-side routing
- local state + global store
- live external data retrieval for weather and FX rates
- no database, no auth, no production backend

Bu o deməkdir ki, sistemin əsas fokus nöqtəsi product/UX validation və iş axını demonstrasiyasıdır; real production security və data integrity təminatı hələ yoxdur.

---

## 4. Core business flows

### 4.1 Vessel operations flow

1. Gəmilər siyahısı göstərilir
2. Gəmi statusu və mövqeyi monitor edilir
3. Port call məlumatları görünür
4. Risk və yük statusu ilə ilişkiləndirilir
5. Gəmi detalları və modal faylları açılır

### 4.2 Vehicle registration flow

Qeydiyyat limandakı real sənəd zəncirini izləyir:

1. **Gəmi · Səfər** — gəmi sabit kartoçkadır, hər gəliş yeni səfər və yeni manifest yaradır
2. **Manifest · Tır** — səfərin manifestindəki tırlar (göyərtə planı / manifest siyahısı) arasından biri seçilir
3. **CMR · İnvoys** — hər tırın CMR-ləri və onlara aid invoyslar; bir tırda bir neçə CMR ola bilər
4. **Bəyannamə · EGB** — qayda: 1 CMR = 1 bəyannamə. Deklarasiyalar EGB-də tır nömrəsi üzrə axtarılıb
   həmin tıra mənimsədilir; uzlaşdırma ekranı gözlənilən / bağlanmış / uyğunsuz sayını göstərir.
   Risk cavabı (yaşıl / qırmızı → fiziki yoxlama, X-ray, kinoloji) bu mərhələdə verilir
5. **VAİS · İcazə blankı** — gəmidən sonra tır və qoşqu qeydiyyata alınır, qoşqu kodu götürülür,
   mallar tıra mənimsədilir; sürücünün gətirdiyi kağız icazə blankı qeydə alınıb özünə qaytarılır
6. **Yol vergisi · Təsdiq** — Vergi Məcəlləsi 211.1.1.3 üzrə hesablama, təsdiq və tarixçəyə yazılma

Səfər səviyyəsində gəminin manifest sənədi (IMO FAL paketi — General Declaration, Cargo
Declaration, ekipaj/sərnişin siyahısı və tır cədvəli) PDF kimi yüklənir. Skanların mətn qatı
olmadığına görə sətirlər avtomatik oxunmur: sənəd `%PDF-` imzası üzrə yoxlanılır, səhifə sayı
təyin edilir, başlıq sahələri operator tərəfindən doldurulur. Backend olmadığına görə fayl
sessiya daxilində object URL kimi saxlanılır — `src/domain/manifestDocument.ts`.

Zəncirin data modeli `src/domain/registrationFlow.ts` faylındadır: mövcud manifest, avtomobil və
bəyannamə fixturlarından tır üzrə CMR → İnvoys → Bəyannamə → EGB statusu törədilir.

### 4.3 Declaration workflow

1. Bəyannamə seçilir
2. Mal detallarına baxılır
3. HS/XİF məlumatı yoxlanılır
4. Status / risk / review konteksti görünür
5. Post qərarına keçid baş verir

---

## 5. Architectural approach

Prototipin arxitekturası “single-page product shell + domain-driven mock model + local store” yanaşması ilə qurulub.

### 5.1 Layered view

```text
Presentation Layer
  ├── Pages
  ├── Components
  ├── Layout / Route shell
  └── Modal / Card / Table / Map UI

Domain Layer
  ├── mockData
  ├── operationalData
  ├── documentSeeds
  └── page-specific derived state

State Layer
  ├── Zustand store
  ├── localStorage persistence
  └── UI actions / filters / selections

Integration Layer
  ├── Open-Meteo weather fetch
  ├── FX rate fetch
  └── client-side live data service
```

Bu struktur o deməkdir ki, appin əsas iddiası UI və iş axını nümayişi olmaqdır. Production data layer və backend abstractions burada hələ tam qurulmayıb.

---

## 6. Frontend architecture details

### 6.1 Routing model

Router əsasən aşağıdakı page set üzərində qurmur:

- `/` → Dashboard
- `/gemiler` → Vessel operations
- `/qeydiyyat` → Registration workflow
- `/beyannameler` → Declarations
- `/tarixce` → History
- `/analitika` → Analytics
- `/parametrler` → Settings

Burada `App.tsx` route shell kimi çıxış edir, `Layout` isə page frame və navigation konteksini təmin edir.

### 6.2 Lazy loading

`App.tsx` əsasən lazy importlardan istifadə edir:

```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Ships = lazy(() => import('./pages/Ships'))
const Registration = lazy(() => import('./pages/Registration'))
```

Bu, initial load zamanı səhifə payloadını azaltmağa və product shell-un daha sürətli açılmasına xidmət edir.

### 6.3 UI composition pattern

UI bir neçə reusable primitive üzərində qurulub:

- `Card`
- `Modal`
- `PageHeader`
- `StatusBadge`
- `Button`

Bu komponentlər `src/components/UI.tsx` daxilində təmiz şəkildə ayrılıb. Bu, page-level logic-i azaltmaqla işləkliyi artırır və kompleks ekranları idarə etməyi asanlaşdırır.

---

## 7. State architecture

### 7.1 Zustand usage

State əsasən `useAppStore.ts` faylında saxlanılır. Bu store-da aşağıdakı dəyərlər var:

- ships
- vehicles
- declarations
- postDecisions
- registrations
- profile
- notifications
- dark theme flag
- sidebar / command menu state

### 7.2 Persistence strategy

Prototipdə localStorage istifadə olunur:

- `vglp-registrations`
- `vglp-profile`
- `vglp-notifications`
- `vglp-theme`

Bu sayədə istifadəçi səhifəni yeniləsə belə müəyyən kontekst saxlanılır. Bu, demo layeri üçün ideal bir pattern-dir; real məhsulda isə secure backend persistence ilə əvəz edilməlidir.

### 7.3 Derived state

Məntiqin çoxu page-local computed value-lərdən ibarətdir. Misal:

- selected vehicle
- linked declarations
- filtered queue
- risk verdict
- active declaration
- computed cargo totals

Bu pattern, state-in redundant olmasının qarşısını alır və her page-in logicini daha təmiz saxlayır.

---

## 8. Data model design

### 8.1 Mock domain data

Mock datasets strukturun əsasını təşkil edir. Bunların başlıca atributları:

- ship id / name / type / flag
- cargo / tonnage / speed / status
- vehicle registration / cargo / bill of lading
- declaration code / value / currency / status
- post decision metadata

Bu verilənlər demo üçün sabit, ancaq “real domain” hissini saxlaya biləcək səviyyədə quraşdırılıb.

### 8.2 Operational data model

`operationalData.ts` faylı daha domain-centric model yaradır. Burada data strukturları real port call və agency clearance konseptini simulyasiya edir.

Məsələn:

- port call id
- vessel info
- clearance matrix
- ETA / ETD fields
- risk score
- document status
- agency approval states

Bu, UI-nin daha səciyyəvi “operations control tower” hissini yaradır.

### 8.3 Document seed model

`documentSeeds.ts` faylı manifest və declaration seed dokumentlərini saxlayır. Bu data aşağıdakıları əhatə edir:

- bill of lading
- vehicle order
- vehicle IDs
- cargo description
- customs metadata
- document linkage references

Bu layer real bəyannamə və manifest əlaqəsini mock etmir, amma iş axınının necə olacağını göstərir.

---

## 9. Component responsibilities

### `Dashboard.tsx`

- KPI cards
- ship flow statistics
- vehicle queue prioritization
- map modal trigger
- active operation summary

### `Ships.tsx`

- live weather + FX fetch
- AIS radar map
- vessel list + filter actions
- export CSV logic
- new ship creation form

### `Registration.tsx`

- ship and vehicle matching
- manifest matching logic
- risk verdict engine
- declaration association
- tax / permit / manual review logic
- save to local registrations

### `SeaMap.tsx`

- Leaflet-based map rendering
- synthetic vessel positions
- port and route visualization
- compact/full modal use cases

### `ShipScene3D.tsx`

- 3D-inspired vessel presentation layer
- cinematic port visualization
- reused across other panels

### `DeclarationDocumentView.tsx`

- declarations shown in document-like view
- document metadata presentation
- review and understanding of cargo details

---

## 10. Integration points

### 10.1 Weather integration

`liveData.ts` faylı aşağıdaki işləri edir:

- Open-Meteo çağırışını aparır
- temperature, wind, weather metadata alır
- error handling və fallback davranışı təmin edir

### 10.2 FX integration

Aynı service file daxilində valyuta məzənnələri çıxarılır:

- USD/AZN
- rate parsing
- timeout / rejected promise handling

### 10.3 Client-side synthetic data assumptions

Çünki real backend yoxdur, bütün “live” data hələ client-side mock layerdir. Bu o deməkdir ki, service layer real API contract-ə yaxın olsa da, məlumatın mənbəyi hələ real yox, demo sistemdir.

---

## 11. Risk evaluation logic

Risk modelinin əsas prinsipi demo və domain-driven logic təşkil edir.

### Risk triggers

- status = Risk nəzarəti
- keyword scanning in cargo description
- HS/XİF prefix sensitivity
- hazardous product categories
- combination of declaration and cargo semantics

### Safe cargo logic

- safe product keywords
- clean declaration path
- allowed / normal cargo classification

Bu logic `Registration.tsx` içərisində funksional olaraq implementasiya olunub. Real dövriyyədə isə bunun yanında backend risk engine, fraud patterns, historical risk models və human review workflows olacaq.

---

## 12. UI/UX architectural decisions

### 12.1 Data-first panels

Her səhifə bir neçə paneldən ibarətdir:

- primary content panel
- side analytics or summary panel
- action panel
- modal / detail panel

Bu struktur daha çox “ops dashboard” görünüşü verir.

### 12.2 Status semantics

Statuslar sabit, istifadəçi üçün oxunaqlı dəyərlərə bölünür:

- green / approved / safe
- amber / pending / waiting
- red / risk / blocked

Bu pattern, UI-nin iş prosesini daha asan oxunmasını təmin edir.

### 12.3 Responsive layout strategy

Prototipdə istifadəçi ekrani ölçüsünə görə layout dəyişir:

- desktop: multi-column rich dashboard
- tablet: denser but readable card grids
- mobile: compact cards, horizontal tables, simplified actions

Bu, real product-lar üçün vacib olan responsive operational design prinsipini nümayiş etdirir.

---

## 13. Persistence, security and production gaps

### 13.1 Current state

- localStorage used for demo persistence
- no authentication
- no role-based access control
- no encrypted storage
- no API middleware
- no audit events

### 13.2 Production requirements

Real sistem üçün aşağıdakılar tələb olunur:

- backend service layer
- DB with proper schema and migrations
- authn/authz
- audit log and immutable records
- secure storage and encryption
- event-driven syncing
- independent risk engine
- secret management and environment variables
- observability and monitoring

---

## 14. Dependency graph summary

```text
App
 ├── Layout
 │   ├── Sidebar/Nav
 │   └── Mobile shell
 ├── Route pages
 │   ├── Dashboard
 │   ├── Ships
 │   ├── Registration
 │   ├── Declarations
 │   ├── HistoryPage
 │   ├── Analytics
 │   └── SettingsPage
 ├── Shared UI primitives
 │   ├── Card
 │   ├── Modal
 │   ├── PageHeader
 │   └── StatusBadge
 ├── Visual modules
 │   ├── SeaMap
 │   ├── ShipScene3D
 │   └── DeclarationDocumentView
 ├── Stores / services
 │   ├── useAppStore
 │   └── liveData
 └── Data sources
     ├── mockData
     ├── operationalData
     └── documentSeeds
```

---

## 15. Why this architecture is valid for the prototype

Bu arxitektura aşağıdakı səbəblərdən etibarlıdır:

1. product shell və UX focus var
2. business flow is explicit and traceable
3. state management is simple and understandable
4. components are reusable and sliceable
5. data model is aligned with the actual domain language
6. live external data is present without overcomplicating the app

Bu, later production architecture üçün yaxşı başlanğıc nöqtəsidir.

---

## 16. Risk and recommendation

Bu layihə “concept-to-product” keçidində yaxşı mərhələdir. Lakin real sistem üçün aşağıdakı risk sahələri nəzərə alınmalıdır:

- business logic must move to backend
- UI state must not be treated as source of truth
- all risk decisions must be auditable
- external integrations must be secured and tenant-aware
- data contracts must be enforced by schemas

---

## 17. Final assessment

Prototipin arxitekturası operativ liman və gömrük prosesini anlamağa, göstərməyə və pilot istifadəçiyə təqdim etməyə yönəlmişdir. UI, state, data və action patternləri real biznes modelini təqlid etsə də, bunun hələ tam “production-grade system” olmadığı aydındır.

Bu, gələcək inkişaf üçün doğru iş balansıdır: ilkin təsdiq, demonstrasiya, kritik iş axınının yoxlanılması, və sonra backend/system hardening mərhələsinə keçid.

---

## 18. Related docs

- [README_AZ.md](README_AZ.md)
- [docs/ENGINEERING.md](docs/ENGINEERING.md)
- [SECURITY.md](SECURITY.md)
