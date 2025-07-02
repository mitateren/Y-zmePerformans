$(document).ready(function() {
    let jsonData = [];
    let barajlarErkek = null;
    let barajlarKadin = null;
    // Baraj JSON dosyalarını yükle
    $.getJSON('baraj_10yas_erkek.json', function(data) { barajlarErkek = data; tryRender(); });
    $.getJSON('baraj_10yas_kadin.json', function(data) { barajlarKadin = data; tryRender(); });
    $.getJSON('yuzme_sonuclari.json', function(data) { jsonData = data; tryRender(); });

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
        let dosya = cinsiyet === 'Erkek' ? barajlarErkek : barajlarKadin;
        if (!dosya) return '';
        let obj = dosya.find(b => b.etap === '2. Etap ' + tip);
        if (!obj) return '';
        let bransBaraj = obj.barajlar.find(b => b.brans.toLowerCase() === brans.toLowerCase());
        return bransBaraj ? bransBaraj.sure : '';
    }

    function tryRender() {
        if (!jsonData || !barajlarErkek || !barajlarKadin) return;
        renderBransSporcuTablo();
        renderSporcuBransTablo();
        renderKatilimBarajiTablo();
        renderHarcirahBarajiTablo();
        renderSporcuBransKatilimBarajiTablo();
        renderSporcuBransHarcirahBarajiTablo();
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

    function renderBransSporcuTablo() {
        let branslar = getValidBranslar();
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        // Başlık
        let thead = '<tr><th>Branş</th><th>K.B.</th><th>H.B.</th>';
        sporcus.forEach(sporcu => {
            thead += `<th colspan=2>${sporcu}</th>`;
        });
        thead += '</tr>';
        thead += '<tr><th></th><th></th><th></th>';
        sporcus.forEach(() => {
            thead += '<th>K.B.</th><th>H.B.</th>';
        });
        thead += '</tr>';
        $('#brans_sporcu_thead').html(thead);
        // Satırlar
        let tbody = '';
        branslar.forEach(brans => {
            let katilimBaraj = getBaraj(brans, 'Erkek', 'Katılım');
            let harcirahBaraj = getBaraj(brans, 'Erkek', 'Harcırah');
            tbody += `<tr><td>${brans}</td><td><span class='baraj-time'>${katilimBaraj}</span></td><td><span class='baraj-time'>${harcirahBaraj}</span></td>`;
            sporcus.forEach(sporcu => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let katilim = getBaraj(brans, cinsiyet, 'Katılım');
                let harcirah = getBaraj(brans, cinsiyet, 'Harcırah');
                let katilimSaniye = sureStringToSaniye(katilim);
                let harcirahSaniye = sureStringToSaniye(harcirah);
                // Katılım barajı
                let katilimTd = `<td><span class='not-passed'>X</span></td>`;
                let harcirahTd = `<td><span class='not-passed'>X</span></td>`;
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                if (enIyiSure !== null && !isNaN(katilimSaniye) && enIyiSure <= katilimSaniye) {
                    katilimTd = `<td class="passed-baraj"><span class='baraj-time'>${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</span></td>`;
                }
                if (enIyiSure !== null && !isNaN(harcirahSaniye) && enIyiSure <= harcirahSaniye) {
                    harcirahTd = `<td class="passed-baraj"><span class='baraj-time'>${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</span></td>`;
                }
                tbody += katilimTd + harcirahTd;
            });
            tbody += '</tr>';
        });
        $('#brans_sporcu_tbody').html(tbody);
    }

    function renderSporcuBransTablo() {
        let branslar = getValidBranslar();
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        // Başlık
        let thead = '<tr><th>Sporcu</th>';
        branslar.forEach(brans => {
            thead += `<th colspan=2>${brans}</th>`;
        });
        thead += '</tr>';
        thead += '<tr><th></th>';
        branslar.forEach(() => {
            thead += '<th>K.B.</th><th>H.B.</th>';
        });
        thead += '</tr>';
        // Yeni: Baraj süreleri satırı
        thead += '<tr><th></th>';
        branslar.forEach(brans => {
            let kbE = getBaraj(brans, 'Erkek', 'Katılım');
            let kbK = getBaraj(brans, 'Kadın', 'Katılım');
            let hbE = getBaraj(brans, 'Erkek', 'Harcırah');
            let hbK = getBaraj(brans, 'Kadın', 'Harcırah');
            let kbStr = kbE;
            if (kbE && kbK && kbE !== kbK) kbStr = `E: ${kbE}<br>K: ${kbK}`;
            let hbStr = hbE;
            if (hbE && hbK && hbE !== hbK) hbStr = `E: ${hbE}<br>K: ${hbK}`;
            thead += `<th class='baraj-time'>${kbStr}</th><th class='baraj-time'>${hbStr}</th>`;
        });
        thead += '</tr>';
        $('#sporcu_brans_thead').html(thead);
        // Satırlar
        let tbody = '';
        sporcus.forEach(sporcu => {
            tbody += `<tr><td>${sporcu}</td>`;
            branslar.forEach(brans => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let katilim = getBaraj(brans, cinsiyet, 'Katılım');
                let harcirah = getBaraj(brans, cinsiyet, 'Harcırah');
                let katilimSaniye = sureStringToSaniye(katilim);
                let harcirahSaniye = sureStringToSaniye(harcirah);
                let katilimTd = `<td><span class='not-passed'>X</span></td>`;
                let harcirahTd = `<td><span class='not-passed'>X</span></td>`;
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                if (enIyiSure !== null && !isNaN(katilimSaniye) && enIyiSure <= katilimSaniye) {
                    katilimTd = `<td class=\"passed-baraj\"><span class='baraj-time'>${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</span></td>`;
                } else if (enIyiSure !== null) {
                    katilimTd = `<td><span class='baraj-time'>${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</span></td>`;
                }
                if (enIyiSure !== null && !isNaN(harcirahSaniye) && enIyiSure <= harcirahSaniye) {
                    harcirahTd = `<td class=\"passed-baraj\" style=\"background:#007bff;color:#fff;font-weight:bold;\"><span class='baraj-time'>${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</span></td>`;
                } else if (enIyiSure !== null) {
                    harcirahTd = `<td><span class='baraj-time'>${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</span></td>`;
                }
                tbody += katilimTd + harcirahTd;
            });
            tbody += '</tr>';
        });
        $('#sporcu_brans_tbody').html(tbody);
    }

    function renderSporcuBransKatilimBarajiTablo() {
        let branslar = getValidBranslar();
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        let thead = '<tr><th>Sporcu</th>';
        branslar.forEach(brans => { thead += `<th>${brans}</th>`; });
        thead += '</tr>';
        // Baraj süreleri satırı
        thead += '<tr><th></th>';
        branslar.forEach(brans => {
            let kbE = getBaraj(brans, 'Erkek', 'Katılım');
            let kbK = getBaraj(brans, 'Kadın', 'Katılım');
            let kbStr = kbE;
            if (kbE && kbK && kbE !== kbK) kbStr = `E: ${kbE}<br>K: ${kbK}`;
            thead += `<th class='baraj-time'>${kbStr}</th>`;
        });
        thead += '</tr>';
        $('#sporcu_brans_katilim_thead').html(thead);
        let tbody = '';
        sporcus.forEach(sporcu => {
            tbody += `<tr><td>${sporcu}</td>`;
            branslar.forEach(brans => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let katilim = getBaraj(brans, cinsiyet, 'Katılım');
                let katilimSaniye = sureStringToSaniye(katilim);
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                let td = `<td><span class='not-passed'>X</span></td>`;
                if (enIyiSure !== null) {
                    let sureStr = kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"];
                    if (!isNaN(katilimSaniye) && enIyiSure <= katilimSaniye) {
                        td = `<td class=\"passed-baraj\"><span class='baraj-time'>${sureStr}</span></td>`;
                    } else {
                        td = `<td><span class='baraj-time'>${sureStr}</span></td>`;
                    }
                }
                tbody += td;
            });
            tbody += '</tr>';
        });
        $('#sporcu_brans_katilim_tbody').html(tbody);
    }

    function renderSporcuBransHarcirahBarajiTablo() {
        let branslar = getValidBranslar();
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        let thead = '<tr><th>Sporcu</th>';
        branslar.forEach(brans => { thead += `<th>${brans}</th>`; });
        thead += '</tr>';
        // Baraj süreleri satırı
        thead += '<tr><th></th>';
        branslar.forEach(brans => {
            let hbE = getBaraj(brans, 'Erkek', 'Harcırah');
            let hbK = getBaraj(brans, 'Kadın', 'Harcırah');
            let hbStr = hbE;
            if (hbE && hbK && hbE !== hbK) hbStr = `E: ${hbE}<br>K: ${hbK}`;
            thead += `<th class='baraj-time'>${hbStr}</th>`;
        });
        thead += '</tr>';
        $('#sporcu_brans_harcirah_thead').html(thead);
        let tbody = '';
        sporcus.forEach(sporcu => {
            tbody += `<tr><td>${sporcu}</td>`;
            branslar.forEach(brans => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let harcirah = getBaraj(brans, cinsiyet, 'Harcırah');
                let harcirahSaniye = sureStringToSaniye(harcirah);
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                let td = `<td><span class='not-passed'>X</span></td>`;
                if (enIyiSure !== null) {
                    let sureStr = kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"];
                    if (!isNaN(harcirahSaniye) && enIyiSure <= harcirahSaniye) {
                        td = `<td class=\"passed-baraj\" style=\"background:#007bff;color:#fff;font-weight:bold;\"><span class='baraj-time'>${sureStr}</span></td>`;
                    } else {
                        td = `<td><span class='baraj-time'>${sureStr}</span></td>`;
                    }
                }
                tbody += td;
            });
            tbody += '</tr>';
        });
        $('#sporcu_brans_harcirah_tbody').html(tbody);
    }

    function renderKatilimBarajiTablo() {
        let branslar = getValidBranslar();
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        // Başlık
        let thead = '<tr><th>Branş</th><th>Baraj Süresi</th>';
        sporcus.forEach(sporcu => { thead += `<th>${sporcu}</th>`; });
        thead += '</tr>';
        $('#katilimBarajiTabloHeader').html(thead);
        // Satırlar
        let tbody = '';
        branslar.forEach(brans => {
            // Erkek ve kadın barajlarını göster (ilk bulunan cinsiyete göre)
            let erkekBaraj = getBaraj(brans, 'Erkek', 'Katılım');
            let kadinBaraj = getBaraj(brans, 'Kadın', 'Katılım');
            let barajSuresiGoster = erkekBaraj;
            if (erkekBaraj && kadinBaraj && erkekBaraj !== kadinBaraj) {
                barajSuresiGoster = `E: ${erkekBaraj}<br>K: ${kadinBaraj}`;
            }
            tbody += `<tr><td>${brans}</td><td>${barajSuresiGoster}</td>`;
            sporcus.forEach(sporcu => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let katilim = getBaraj(brans, cinsiyet, 'Katılım');
                let katilimSaniye = sureStringToSaniye(katilim);
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                let td = `<td><span class='not-passed'>X</span></td>`;
                if (enIyiSure !== null) {
                    let sureStr = kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"];
                    if (!isNaN(katilimSaniye) && enIyiSure <= katilimSaniye) {
                        td = `<td class=\"passed-baraj\"><span class='baraj-time'>${sureStr}</span></td>`;
                    } else {
                        td = `<td><span class='baraj-time'>${sureStr}</span></td>`;
                    }
                }
                tbody += td;
            });
            tbody += '</tr>';
        });
        $('#katilimBarajiTabloBody').html(tbody);
    }

    function renderHarcirahBarajiTablo() {
        let branslar = getValidBranslar();
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        // Başlık
        let thead = '<tr><th>Branş</th><th>Baraj Süresi</th>';
        sporcus.forEach(sporcu => { thead += `<th>${sporcu}</th>`; });
        thead += '</tr>';
        $('#harcirahBarajiTabloHeader').html(thead);
        // Satırlar
        let tbody = '';
        branslar.forEach(brans => {
            let erkekBaraj = getBaraj(brans, 'Erkek', 'Harcırah');
            let kadinBaraj = getBaraj(brans, 'Kadın', 'Harcırah');
            let barajSuresiGoster = erkekBaraj;
            if (erkekBaraj && kadinBaraj && erkekBaraj !== kadinBaraj) {
                barajSuresiGoster = `E: ${erkekBaraj}<br>K: ${kadinBaraj}`;
            }
            tbody += `<tr><td>${brans}</td><td>${barajSuresiGoster}</td>`;
            sporcus.forEach(sporcu => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let harcirah = getBaraj(brans, cinsiyet, 'Harcırah');
                let harcirahSaniye = sureStringToSaniye(harcirah);
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                let td = `<td><span class='not-passed'>X</span></td>`;
                if (enIyiSure !== null) {
                    let sureStr = kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"];
                    if (!isNaN(harcirahSaniye) && enIyiSure <= harcirahSaniye) {
                        td = `<td class=\"passed-baraj\" style=\"background:#007bff;color:#fff;font-weight:bold;\"><span class='baraj-time'>${sureStr}</span></td>`;
                    } else {
                        td = `<td><span class='baraj-time'>${sureStr}</span></td>`;
                    }
                }
                tbody += td;
            });
            tbody += '</tr>';
        });
        $('#harcirahBarajiTabloBody').html(tbody);
    }
}); 