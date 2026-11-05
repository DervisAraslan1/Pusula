# Pusula

Günlük planlama uygulaması. Görevlerini takip eder, geçmişinden öğrenerek öneri sunar. Veriler yalnızca tarayıcıda (`localStorage`) durur; sunucu ve API anahtarı gerekmez.

## Çalıştırma

```bash
npm install
npm run dev
```

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusunu başlatır ve tarayıcıyı açar |
| `npm test` | Tarih, ayrıştırma, istatistik ve öneri testleri |
| `npm run build` | Tip kontrolü ve `dist/` üretim derlemesi |

## Hızlı ekleme

Görevi tek satırda yaz, gerisini Pusula anlar:

```
yarın 14:30 müşteri görüşmesi 45dk !
cuma saat 9 yoga 1 saat #sağlık
```

- **Gün:** `bugün`, `yarın`, `öbür gün`, hafta günleri
- **Saat:** `14:30`, `saat 9`
- **Süre:** `45dk`, `1,5 saat`
- **Öncelik:** `!`
- **Alan:** `#iş`, `#kişisel`, `#sağlık`, `#öğrenme`, `#ev`

Görev girmek için herhangi bir yerde `N` tuşuna bas.

## Öneriler nasıl çalışır?

Öneriler `src/lib/suggest.ts` içindeki kurallarla, yalnızca senin verilerinden hesaplanır. Her öneri gerekçesini kendi rakamlarınla gösterir.

| Öneri | Dayanağı |
|---|---|
| Kalan işler | Önceki günlerden tamamlanmayan görevler |
| Haftalık düzen | Son 6 haftada aynı gün en az 3 kez yapılanlar |
| Alışkanlık | Son 14 günde en az 7 kez yapılanlar |
| Verimli saat | Alan ve saat dilimine göre tamamlama oranı |
| Yük dengesi | Bugünün planı ile günlük ortalaman |
| Tıkanıklık | En az 3 kez ertelenen görevler |
| Süre tahmini | Odak modunda ölçülen süre ile plan farkı |
| Denge | 7 gündür dokunulmayan alanlar |
| Seri | Akşam olduğu hâlde bozulmak üzere olan seri |

Kabul ettiğin öneri türleri öne çıkar, kapattıkların geriye düşer.

## Yedekleme

Veriler tarayıcıya bağlıdır: tarayıcı verilerini temizlersen silinir, başka cihazda görünmez. Yedek almak için **Ayarlar** sayfasındaki **Verilerim** bölümünü kullan.

## Temalar

**Ayarlar** sayfasından Lacivert, Buz, Kehribar, Kum ve Zümrüt arasında seçim yapılır. Tema değerleri `src/styles.css`, listesi `src/lib/themes.ts` içindedir.
