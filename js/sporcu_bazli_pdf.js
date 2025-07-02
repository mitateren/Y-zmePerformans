$(document).ready(function() {
    let jsonData = [];
    let barajlarErkek = null;
    let barajlarKadin = null;
    function tryRender() {
        if (jsonData.length && barajlarErkek && barajlarKadin) renderAllAthletes();
    }
    function getValidBranslar() {
        let branslar = [...new Set(jsonData.map(x => x["Branş"]))];
        return branslar.filter(function(brans) {
            if (!brans) return false;
            if (!isNaN(brans)) return false;
            if (/\d{4}-\d{2}-\d{2}/.test(brans)) return false;
            if (/\d{2}\.\d{2}\.\d{4}/.test(brans)) return false;
            if (brans.length < 3) return false;
            return true;
        });
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
    function formatTarih(ms) {
        if (!ms) return '';
        let d = new Date(ms);
        return d.toLocaleDateString('tr-TR');
    }
    function getBarajFromJson(barajlar, brans, tip) {
        if (!barajlar) return '';
        let obj = barajlar.find(b => b.etap === '2. Etap ' + tip);
        if (!obj) return '';
        let bransBaraj = obj.barajlar.find(b => b.brans.toLowerCase() === brans.toLowerCase());
        return bransBaraj ? bransBaraj.sure : '';
    }
    $.getJSON('yuzme_sonuclari.json', function(data) {
        jsonData = data.filter(function(x) {
            if (!x["Tarih"]) return false;
            let yil = new Date(x["Tarih"]).getFullYear();
            return yil === 2025;
        });
        tryRender();
    });
    $.getJSON('baraj_10yas_erkek.json', function(data) { barajlarErkek = data; tryRender(); });
    $.getJSON('baraj_10yas_kadin.json', function(data) { barajlarKadin = data; tryRender(); });
    function renderAllAthletes() {
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        let branslar = getValidBranslar();
        let allHtml = '';
        sporcus.forEach(function(sporcu, idx) {
            let sporcuVeri = jsonData.filter(x => x["Ad Soyad"] === sporcu);
            // Tüm tarihleri topla ve sırala
            let tumTarihlerSet = new Set();
            sporcuVeri.forEach(function(item) { tumTarihlerSet.add(item["Tarih"]); });
            let tumTarihler = Array.from(tumTarihlerSet);
            tumTarihler.sort((a, b) => a - b);
            let tumTarihlerLabel = tumTarihler.map(formatTarih);
            // Tablo başlıkları
            let headerHtml = '<th>Branş</th>';
            tumTarihlerLabel.forEach(function(tarih) { headerHtml += `<th>${tarih}</th>`; });
            // Tablo satırları
            let tabloHtml = '';
            branslar.forEach(function(brans) {
                let kayitlar = sporcuVeri.filter(x => x["Branş"] === brans);
                tabloHtml += `<tr><td>${brans}</td>`;
                tumTarihler.forEach(function(tarih) {
                    let kayit = kayitlar.find(x => x["Tarih"] === tarih);
                    let sure = kayit ? kayit["Süre"] : '';
                    tabloHtml += `<td>${sure}</td>`;
                });
                tabloHtml += '</tr>';
            });
            // Her sporcu için bölüm oluştur
            allHtml += `<div class='athlete-section${idx < sporcus.length-1 ? ' page-break' : ''}'>`;
            allHtml += `<h3 class='athlete-title'>${sporcu}</h3>`;
            allHtml += `<div class='table-responsive'><table class='table table-bordered'><thead><tr>${headerHtml}</tr></thead><tbody>${tabloHtml}</tbody></table></div>`;
            allHtml += `<div class='table-responsive'><canvas id='athleteChart_${idx}' style='width:100%;max-width:1400px;height:600px;'></canvas></div>`;
            allHtml += '</div>';
        });
        $('#allAthletes').html(allHtml);
        // Grafikler
        sporcus.forEach(function(sporcu, idx) {
            let sporcuVeri = jsonData.filter(x => x["Ad Soyad"] === sporcu);
            let renkler = [
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)'
            ];
            // Her branş için ayrı dataset
            let branslar = getValidBranslar();
            let datasets = branslar.map(function(brans, bidx) {
                let kayitlar = sporcuVeri.filter(x => x["Branş"] === brans && x["Süre"]);
                let data = kayitlar.map(function(k) {
                    return {
                        x: formatTarih(k["Tarih"]),
                        y: sureStringToSaniye(k["Süre"])
                    };
                }).filter(d => !isNaN(d.y));
                return {
                    label: brans,
                    data: data,
                    backgroundColor: renkler[bidx % renkler.length],
                    borderColor: renkler[bidx % renkler.length],
                    fill: false,
                    tension: 0.3
                };
            });
            // Tüm tarihleri topla ve sırala
            let tumTarihlerSet = new Set();
            sporcuVeri.forEach(function(item) { tumTarihlerSet.add(item["Tarih"]); });
            let tumTarihler = Array.from(tumTarihlerSet);
            tumTarihler.sort((a, b) => a - b);
            let tumTarihlerLabel = tumTarihler.map(formatTarih);
            let ctx = document.getElementById('athleteChart_' + idx);
            if (ctx) {
                let parent = ctx.parentElement;
                let width = parent ? parent.offsetWidth : 1000;
                ctx.width = width;
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: tumTarihlerLabel,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true },
                            title: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) label += ': ';
                                        let value = context.parsed.y;
                                        if (value == null || isNaN(value)) return label + '-';
                                        // Dakika:saniye.salise
                                        let saniye = Math.abs(value);
                                        let dakika = Math.floor(saniye / 60);
                                        let kalanSaniye = saniye % 60;
                                        return label + (dakika < 10 ? '0' : '') + dakika + ':' + (kalanSaniye < 10 ? '0' : '') + kalanSaniye.toFixed(2);
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                type: 'category',
                                title: {
                                    display: true,
                                    text: 'Tarih'
                                }
                            },
                            y: {
                                beginAtZero: false,
                                title: {
                                    display: true,
                                    text: 'Süre (dk:ss.ss)'
                                },
                                ticks: {
                                    callback: function(value) {
                                        if (value == null || isNaN(value)) return '-';
                                        let saniye = Math.abs(value);
                                        let dakika = Math.floor(saniye / 60);
                                        let kalanSaniye = saniye % 60;
                                        return (dakika < 10 ? '0' : '') + dakika + ':' + (kalanSaniye < 10 ? '0' : '') + kalanSaniye.toFixed(2);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    }
}); 