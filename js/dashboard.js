$(document).ready(function() {
    let jsonData = [];
    let currentSporcu = null;
    let chart = null;
    let seciliYillar = [2025];
    let barajlarErkek = null;
    let barajlarKadin = null;
    let barajlarHazir = false;
    let jsonHazir = false;

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
        tabloVeGrafikGuncelleWrapper();
    });

    function tabloVeGrafikGuncelleWrapper() {
        if (barajlarHazir && jsonHazir) {
            tabloVeGrafikGuncelle();
        }
    }

    // JSON dosyasını yükle
    $.getJSON('yuzme_sonuclari.json', function(data) {
        jsonData = data;
        jsonHazir = true;
        sporcuListesiniDoldur();
        yilCheckboxlariniDoldur();
        tabloVeGrafikGuncelleWrapper();
    });

    // Baraj JSON dosyalarını yükle
    $.when(
        $.getJSON('baraj_11yas_erkek.json', function(data) { barajlarErkek = data; }),
        $.getJSON('baraj_11yas_kadin.json', function(data) { barajlarKadin = data; })
    ).then(function() {
        barajlarHazir = true;
        tabloVeGrafikGuncelleWrapper();
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
        tabloVeGrafikGuncelleWrapper();
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

    // Süre stringini saniyeye çevirir (örn: "01:05.75" -> 65.75)
    function sureStringToSaniye(sure) {
        if (!sure) return NaN;
        sure = sure.trim().replace(',', '.');
        // DSQ, DNS, vb. ise NaN döndür
        if (isNaN(sure.replace(':', ''))) return NaN;
        let parts = sure.split(':');
        if (parts.length === 1) {
            // Sadece saniye
            return parseFloat(parts[0]);
        } else if (parts.length === 2) {
            // dakika:saniye
            let dakika = parseInt(parts[0], 10);
            let saniye = parseFloat(parts[1]);
            return dakika * 60 + saniye;
        } else if (parts.length === 3) {
            // saat:dakika:saniye (gerekirse)
            let saat = parseInt(parts[0], 10);
            let dakika = parseInt(parts[1], 10);
            let saniye = parseFloat(parts[2]);
            return saat * 3600 + dakika * 60 + saniye;
        }
        return NaN;
    }

    // Branş adlarını normalize eden fonksiyon
    function normalizeBrans(str) {
        return (str || '')
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ş/g, 's')
            .replace(/ç/g, 'c')
            .replace(/ü/g, 'u')
            .replace(/ö/g, 'o')
            .replace(/ğ/g, 'g')
            .replace(/\s+/g, '')
            .replace(/m/g, '') // 50m Serbest -> 50 Serbest
            .replace(/\./g, '');
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
        let headerHtml = '<th>Branş</th><th>Katılım Barajı</th><th>Harcırah Barajı</th>';
        tumTarihlerLabel.forEach(function(tarih) {
            headerHtml += `<th>${tarih}</th>`;
        });
        headerHtml += '<th>Grafik</th>';
        $('#bransFarkHeader').html(headerHtml);

        // Tablo satırlarını oluştur
        let bransFarkHtml = '';
        branslar.forEach(function(brans, bransIdx) {
            // Barajları bul (sadece 2. Etap)
            let sporcu = jsonData.find(x => x["Ad Soyad"] === currentSporcu);
            let cinsiyet = sporcu ? sporcu["Cinsiyet"] : null;
            let barajlar = (cinsiyet === 'Erkek') ? barajlarErkek : barajlarKadin;
            let katilim = '';
            let harcirah = '';
            if (barajlar) {
                let katilimObj = barajlar.find(b => b.etap === '2. Etap Katılım');
                let harcirahObj = barajlar.find(b => b.etap === '2. Etap Harcırah');
                if (katilimObj) {
                    let bransBaraj = katilimObj.barajlar.find(b => normalizeBrans(b.brans) === normalizeBrans(brans));
                    katilim = bransBaraj ? bransBaraj.sure : '';
                }
                if (harcirahObj) {
                    let bransBaraj = harcirahObj.barajlar.find(b => normalizeBrans(b.brans) === normalizeBrans(brans));
                    harcirah = bransBaraj ? bransBaraj.sure : '';
                }
            }
            // Sporcunun en iyi süresini bul (bu branşta)
            let kayitlar = bransGrupla[brans].sort((a,b) => a["Tarih"] - b["Tarih"]);
            let sporcuSureleri = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
            let enIyiSporcuSuresi = sporcuSureleri.length > 0 ? Math.min(...sporcuSureleri) : null;
            let katilimSaniye = sureStringToSaniye(katilim);
            let harcirahSaniye = sureStringToSaniye(harcirah);
            // Katılım ve harcırah barajı hücrelerini belirginleştir
            let katilimTd = `<td>${katilim}</td>`;
            let harcirahTd = `<td>${harcirah}</td>`;
            if (enIyiSporcuSuresi !== null && !isNaN(katilimSaniye) && enIyiSporcuSuresi <= katilimSaniye) {
                katilimTd = `<td style=\"background:#28a745;color:#fff;font-weight:bold;\">${katilim}</td>`;
            }
            if (enIyiSporcuSuresi !== null && !isNaN(harcirahSaniye) && enIyiSporcuSuresi <= harcirahSaniye) {
                harcirahTd = `<td style=\"background:#007bff;color:#fff;font-weight:bold;\">${harcirah}</td>`;
            }
            let sureler = tumTarihler.map(function(tarih) {
                let kayit = kayitlar.find(x => x["Tarih"] === tarih);
                return kayit ? kayit["Süre"] : '';
            });
            // Satırdaki en iyi süreyi bul (en düşük anlamlı süre, toleranslı)
            let anlamliSureler = sureler
                .map(s => sureStringToSaniye(s))
                .filter(s => !isNaN(s));
            let enIyiSure = null;
            if (anlamliSureler.length > 0) {
                enIyiSure = Math.min(...anlamliSureler);
            }
            // Sadece ilk karşılaşılan en iyi süreyi vurgula
            let enIyiVurgulandi = false;
            // Her branş için benzersiz canvas id'si
            let canvasId = `sparkline_${bransIdx}`;
            bransFarkHtml += `<tr><td>${brans}</td>${katilimTd}${harcirahTd}`;
            sureler.forEach(function(sure) {
                let sureSaniye = sureStringToSaniye(sure);
                let isBest = false;
                if (!enIyiVurgulandi && !isNaN(sureSaniye)) {
                    if (enIyiSure !== null && Math.abs(sureSaniye - enIyiSure) < 0.001) {
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