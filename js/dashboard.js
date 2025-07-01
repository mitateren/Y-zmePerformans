$(document).ready(function() {
    let jsonData = [];
    let currentSporcu = null;
    let chart = null;
    let seciliYillar = [2024, 2025];

    // Yılları bul ve checkboxları oluştur
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

    // Checkbox değişince filtrele
    $(document).on('change', '.yil-checkbox', function() {
        seciliYillar = $('.yil-checkbox:checked').map(function(){ return parseInt(this.value); }).get();
        tabloVeGrafikGuncelle();
    });

    // JSON dosyasını yükle
    $.getJSON('yuzme_sonuclari.json', function(data) {
        jsonData = data;
        sporcuListesiniDoldur();
        yilCheckboxlariniDoldur();
    });

    function sporcuListesiniDoldur() {
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        sporcus.sort();
        sporcus.forEach(function(ad) {
            $('#sporcuSelect').append(`<option value="${ad}">${ad}</option>`);
        });
        // Otomatik ilk sporcuyu seç
        if (sporcus.length > 0) {
            $('#sporcuSelect').val(sporcus[0]);
            currentSporcu = sporcus[0];
            tabloVeGrafikGuncelle();
        }
    }

    $('#sporcuSelect').on('change', function() {
        let ad = $(this).val();
        if (!ad) return;
        currentSporcu = ad;
        tabloVeGrafikGuncelle();
    });

    function formatTarih(ms) {
        if (!ms) return '';
        let d = new Date(ms);
        return d.toLocaleDateString('tr-TR');
    }

    function saniyeToDakikaSaniye(saniye) {
        saniye = Math.abs(saniye);
        let dakika = Math.floor(saniye / 60);
        let kalanSaniye = saniye % 60;
        // 2 haneli dakika, 2 haneli saniye, 2 haneli salise
        return (
            (dakika < 10 ? '0' : '') + dakika + ':' +
            (kalanSaniye < 10 ? '0' : '') + kalanSaniye.toFixed(2)
        );
    }

    function tabloVeGrafikGuncelle() {
        // Yıl filtresi uygula
        let sporcuVeri = jsonData.filter(x => x["Ad Soyad"] === currentSporcu && seciliYillar.includes(new Date(x["Tarih"]).getFullYear()));
        // Yarışlar tablosu
        let yarislarHtml = '';
        sporcuVeri.forEach(function(item) {
            yarislarHtml += `<tr><td>${item["Yarış Adı"]}</td><td>${item["Branş"]}</td><td>${item["Süre"]}</td><td>${formatTarih(item["Tarih"])}</td></tr>`;
        });
        $('#yarislarTablo tbody').html(yarislarHtml);

        // --- Yıllara Göre Yarış Sayısı Tablosu (Yıl filtresiz) ---
        let tumYarislar = jsonData.filter(x => x["Ad Soyad"] === currentSporcu);
        let yilSayilari = {};
        tumYarislar.forEach(function(item) {
            let yil = new Date(item["Tarih"]).getFullYear();
            if (!yilSayilari[yil]) yilSayilari[yil] = 0;
            yilSayilari[yil]++;
        });
        let yillar = Object.keys(yilSayilari).sort();
        let yilTabloHtml = '<table class="table table-sm table-bordered w-auto"><thead><tr>';
        yillar.forEach(function(yil) { yilTabloHtml += `<th>${yil}</th>`; });
        yilTabloHtml += '</tr></thead><tbody><tr>';
        yillar.forEach(function(yil) { yilTabloHtml += `<td>${yilSayilari[yil]}</td>`; });
        yilTabloHtml += '</tr></tbody></table>';
        $('#yilYarisSayisiTablo').html(yilTabloHtml);

        // Branşlar tablosu ve grafik verisi
        let bransGrupla = {};
        sporcuVeri.forEach(function(item) {
            if (!bransGrupla[item["Branş"]]) bransGrupla[item["Branş"]] = [];
            bransGrupla[item["Branş"]].push(item);
        });
        let branslar = Object.keys(bransGrupla);

        // --- Branşlar - İlk ve Son Süre Farkı Tablosu ---
        // 1. Tüm tarihleri topla ve sırala
        let tumTarihlerSet = new Set();
        branslar.forEach(function(brans) {
            bransGrupla[brans].forEach(function(item) {
                tumTarihlerSet.add(item["Tarih"]);
            });
        });
        let tumTarihler = Array.from(tumTarihlerSet);
        tumTarihler.sort((a, b) => a - b);
        let tumTarihlerLabel = tumTarihler.map(formatTarih);

        // Tablo başlıklarını oluştur
        let headerHtml = '<th>Branş</th>';
        tumTarihlerLabel.forEach(function(tarih) {
            headerHtml += `<th>${tarih}</th>`;
        });
        headerHtml += '<th>Grafik</th>';
        $('#bransFarkHeader').html(headerHtml);

        // Tablo satırlarını oluştur
        let bransFarkHtml = '';
        branslar.forEach(function(brans, bransIdx) {
            let kayitlar = bransGrupla[brans].sort((a,b) => a["Tarih"] - b["Tarih"]);
            let sureler = tumTarihler.map(function(tarih) {
                let kayit = kayitlar.find(x => x["Tarih"] === tarih);
                return kayit ? kayit["Süre"] : '';
            });
            // Satırdaki en iyi süreyi bul (en düşük anlamlı süre, toleranslı)
            let anlamliSureler = sureler
                .map(s => (s || '').trim().replace(',', '.'))
                .filter(s => s && !isNaN(parseFloat(s)));
            let enIyiSure = null;
            if (anlamliSureler.length > 0) {
                enIyiSure = Math.min(...anlamliSureler.map(s => parseFloat(s)));
            }
            // Sadece ilk karşılaşılan en iyi süreyi vurgula
            let enIyiVurgulandi = false;
            // Her branş için benzersiz canvas id'si
            let canvasId = `sparkline_${bransIdx}`;
            bransFarkHtml += `<tr><td>${brans}</td>`;
            sureler.forEach(function(sure) {
                let sureTemiz = (sure || '').trim().replace(',', '.');
                let isBest = false;
                if (!enIyiVurgulandi && sureTemiz && !isNaN(parseFloat(sureTemiz))) {
                    let val = parseFloat(sureTemiz);
                    if (enIyiSure !== null && Math.abs(val - enIyiSure) < 0.001) {
                        isBest = true;
                        enIyiVurgulandi = true;
                    }
                }
                if (isBest) {
                    bransFarkHtml += `<td style=\"background:#28a745;color:#fff;font-weight:bold;\">🏅 ${sure}</td>`;
                } else {
                    bransFarkHtml += `<td>${sure}</td>`;
                }
            });
            bransFarkHtml += `<td><canvas id=\"${canvasId}\" height=\"30\" width=\"80\"></canvas></td></tr>`;
        });
        $('#bransFarkTablo tbody').html(bransFarkHtml);

        // Her branş için sparkline çiz
        branslar.forEach(function(brans, bransIdx) {
            let kayitlar = bransGrupla[brans].sort((a,b) => a["Tarih"] - b["Tarih"]);
            let data = kayitlar.map(x => parseFloat(x["Süre"].replace(',', '.')));
            let ctx = document.getElementById(`sparkline_${bransIdx}`);
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map((_, i) => i+1),
                        datasets: [{
                            data: data,
                            borderColor: 'rgba(54,162,235,1)',
                            backgroundColor: 'rgba(54,162,235,0.1)',
                            borderWidth: 2,
                            pointRadius: 0,
                            fill: false,
                            tension: 0.3
                        }]
                    },
                    options: {
                        plugins: { legend: { display: false }, tooltip: { enabled: false } },
                        scales: { x: { display: false }, y: { display: false } },
                        elements: { line: { borderWidth: 2 } },
                        responsive: false,
                        maintainAspectRatio: false
                    }
                });
            }
        });

        // --- Branşların Süreleri - Çubuk Grafik (her branş için, tarihe göre) ---
        let renkler = [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
        ];
        let datasets = branslar.map(function(brans, idx) {
            let veri = tumTarihler.map(function(tarih) {
                let kayit = bransGrupla[brans].find(x => x["Tarih"] === tarih);
                return kayit ? parseFloat(kayit["Süre"].replace(',', '.')) : null;
            });
            return {
                label: brans,
                data: veri,
                backgroundColor: renkler[idx % renkler.length]
            };
        });

        if (chart) chart.destroy();
        chart = new Chart($('#bransChart'), {
            type: 'bar',
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
                    y: { beginAtZero: true }
                }
            }
        });
    }
}); 