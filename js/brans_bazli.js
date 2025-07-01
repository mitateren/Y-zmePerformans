$(document).ready(function() {
    let jsonData = [];
    let seciliBrans = null;
    let seciliYillar = [2025];
    let chart = null;

    // JSON dosyasını yükle
    $.getJSON('yuzme_sonuclari.json', function(data) {
        jsonData = data;
        bransListesiniDoldur();
        yilCheckboxlariniDoldur();
    });

    function bransListesiniDoldur() {
        let branslar = [...new Set(jsonData.map(x => x["Branş"]))];
        branslar.sort();
        branslar.forEach(function(brans) {
            $('#bransSelect').append(`<option value="${brans}">${brans}</option>`);
        });
        // Otomatik ilk branşı seç
        if (branslar.length > 0) {
            $('#bransSelect').val(branslar[0]);
            seciliBrans = branslar[0];
            tabloVeGrafikGuncelle();
        }
    }

    $('#bransSelect').on('change', function() {
        let brans = $(this).val();
        if (!brans) return;
        seciliBrans = brans;
        tabloVeGrafikGuncelle();
    });

    function yilCheckboxlariniDoldur() {
        let yillarSet = new Set(jsonData.map(x => {
            let tarih = x["Tarih"];
            if (!tarih) return null;
            let d = new Date(tarih);
            return d.getFullYear();
        }).filter(Boolean));
        let yillar = Array.from(yillarSet).sort();
        let html = '<label class="form-label me-2">Yıllar:</label>';
        yillar.forEach(function(yil) {
            let checked = (seciliYillar.includes(yil)) ? 'checked' : '';
            html += `<div class="form-check form-check-inline">
                <input class="form-check-input yil-checkbox" type="checkbox" value="${yil}" id="yil_${yil}" ${checked}>
                <label class="form-check-label" for="yil_${yil}">${yil}</label>
            </div>`;
        });
        $('#yilCheckboxlar').html(html);
    }

    $(document).on('change', '.yil-checkbox', function() {
        seciliYillar = $('.yil-checkbox:checked').map(function(){ return parseInt(this.value); }).get();
        tabloVeGrafikGuncelle();
    });

    function formatTarih(ms) {
        if (!ms) return '';
        let d = new Date(ms);
        return d.toLocaleDateString('tr-TR');
    }

    function sureStringToSaniye(sure) {
        if (!sure) return NaN;
        sure = sure.trim().replace(',', '.');
        if (isNaN(sure.replace(':', ''))) return NaN;
        let parts = sure.split(':');
        if (parts.length === 1) {
            return parseFloat(parts[0]);
        } else if (parts.length === 2) {
            let dakika = parseInt(parts[0], 10);
            let saniye = parseFloat(parts[1]);
            return dakika * 60 + saniye;
        } else if (parts.length === 3) {
            let saat = parseInt(parts[0], 10);
            let dakika = parseInt(parts[1], 10);
            let saniye = parseFloat(parts[2]);
            return saat * 3600 + dakika * 60 + saniye;
        }
        return NaN;
    }

    function getBaraj(brans, cinsiyet, tip) {
        // tip: 'Katılım' veya 'Harcırah'
        let dosya = cinsiyet === 'Erkek' ? window.barajlarErkek : window.barajlarKadin;
        if (!dosya) return '';
        let obj = dosya.find(b => b.etap === '2. Etap ' + tip);
        if (!obj) return '';
        let bransBaraj = obj.barajlar.find(b => b.brans.toLowerCase() === brans.toLowerCase());
        return bransBaraj ? bransBaraj.sure : '';
    }

    // Baraj JSON dosyalarını yükle
    window.barajlarErkek = null;
    window.barajlarKadin = null;
    $.getJSON('baraj_10yas_erkek.json', function(data) { window.barajlarErkek = data; });
    $.getJSON('baraj_10yas_kadin.json', function(data) { window.barajlarKadin = data; });

    function tabloVeGrafikGuncelle() {
        if (!seciliBrans) return;
        let bransVeri = jsonData.filter(x => x["Branş"] === seciliBrans && seciliYillar.includes(new Date(x["Tarih"]).getFullYear()));
        let sporcus = [...new Set(bransVeri.map(x => x["Ad Soyad"]))];
        // Tüm tarihleri topla ve sırala
        let tumTarihlerSet = new Set();
        bransVeri.forEach(function(item) { tumTarihlerSet.add(item["Tarih"]); });
        let tumTarihler = Array.from(tumTarihlerSet);
        tumTarihler.sort((a, b) => a - b);
        let tumTarihlerLabel = tumTarihler.map(formatTarih);

        // Tablo başlıkları
        let headerHtml = '<th>Sporcu</th><th>Katılım Barajı</th><th>Harcırah Barajı</th>';
        tumTarihlerLabel.forEach(function(tarih) { headerHtml += `<th>${tarih}</th>`; });
        headerHtml += '<th>Grafik</th>';
        $('#sporcularTabloHeader').html(headerHtml);

        // Tablo satırları
        let tabloHtml = '';
        sporcus.forEach(function(sporcu, idx) {
            // Cinsiyet bul
            let sporcuKayit = bransVeri.find(x => x["Ad Soyad"] === sporcu);
            let cinsiyet = sporcuKayit ? sporcuKayit["Cinsiyet"] : 'Erkek';
            let katilim = getBaraj(seciliBrans, cinsiyet, 'Katılım');
            let harcirah = getBaraj(seciliBrans, cinsiyet, 'Harcırah');
            let katilimSaniye = sureStringToSaniye(katilim);
            let harcirahSaniye = sureStringToSaniye(harcirah);
            // Sporcunun en iyi süresini bul
            let kayitlar = bransVeri.filter(x => x["Ad Soyad"] === sporcu);
            let sporcuSureleri = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
            let enIyiSporcuSuresi = sporcuSureleri.length > 0 ? Math.min(...sporcuSureleri) : null;
            // Baraj vurgusu
            let katilimTd = `<td>${katilim}</td>`;
            let harcirahTd = `<td>${harcirah}</td>`;
            if (enIyiSporcuSuresi !== null && !isNaN(katilimSaniye) && enIyiSporcuSuresi <= katilimSaniye) {
                katilimTd = `<td style=\"background:#28a745;color:#fff;font-weight:bold;\">${katilim}</td>`;
            }
            if (enIyiSporcuSuresi !== null && !isNaN(harcirahSaniye) && enIyiSporcuSuresi <= harcirahSaniye) {
                harcirahTd = `<td style=\"background:#007bff;color:#fff;font-weight:bold;\">${harcirah}</td>`;
            }
            tabloHtml += `<tr><td>${sporcu}</td>${katilimTd}${harcirahTd}`;
            tumTarihler.forEach(function(tarih) {
                let kayit = kayitlar.find(x => x["Tarih"] === tarih);
                let sure = kayit ? kayit["Süre"] : '';
                let sureSaniye = sureStringToSaniye(sure);
                let td = `<td>${sure}</td>`;
                if (!isNaN(sureSaniye) && !isNaN(harcirahSaniye) && sureSaniye <= harcirahSaniye) {
                    td = `<td style=\"background:#007bff;color:#fff;font-weight:bold;\">${sure}</td>`;
                } else if (!isNaN(sureSaniye) && !isNaN(katilimSaniye) && sureSaniye <= katilimSaniye) {
                    td = `<td style=\"background:#28a745;color:#fff;font-weight:bold;\">${sure}</td>`;
                }
                tabloHtml += td;
            });
            // Grafik hücresi (isteğe bağlı, boş bırakılabilir veya sparkline eklenebilir)
            tabloHtml += '<td></td></tr>';
        });
        $('#sporcularTablo tbody').html(tabloHtml);

        // Grafik
        let datasets = sporcus.map(function(sporcu, idx) {
            let veri = tumTarihler.map(function(tarih) {
                let kayit = bransVeri.find(x => x["Ad Soyad"] === sporcu && x["Tarih"] === tarih);
                return kayit ? parseFloat((kayit["Süre"] || '').replace(',', '.')) : null;
            });
            let renkler = [
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)'
            ];
            return {
                label: sporcu,
                data: veri,
                backgroundColor: renkler[idx % renkler.length],
                borderColor: renkler[idx % renkler.length],
                fill: false,
                tension: 0.3
            };
        });
        if (chart) chart.destroy();
        chart = new Chart($('#bransChart'), {
            type: 'line',
            data: {
                labels: tumTarihlerLabel,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: false }
                },
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });
    }
}); 