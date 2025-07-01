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
    }

    function renderBransSporcuTablo() {
        let branslar = [...new Set(jsonData.map(x => x["Branş"]))];
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        // Başlık
        let thead = '<tr><th>Branş</th><th>Katılım Barajı</th><th>Harcırah Barajı</th>';
        sporcus.forEach(sporcu => {
            thead += `<th colspan=2>${sporcu}</th>`;
        });
        thead += '</tr>';
        thead += '<tr><th></th><th></th><th></th>';
        sporcus.forEach(() => {
            thead += '<th>Katılım Barajı</th><th>Harcırah Barajı</th>';
        });
        thead += '</tr>';
        $('#brans_sporcu_thead').html(thead);
        // Satırlar
        let tbody = '';
        branslar.forEach(brans => {
            let katilimBaraj = getBaraj(brans, 'Erkek', 'Katılım');
            let harcirahBaraj = getBaraj(brans, 'Erkek', 'Harcırah');
            tbody += `<tr><td>${brans}</td><td>${katilimBaraj}</td><td>${harcirahBaraj}</td>`;
            sporcus.forEach(sporcu => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let katilim = getBaraj(brans, cinsiyet, 'Katılım');
                let harcirah = getBaraj(brans, cinsiyet, 'Harcırah');
                let katilimSaniye = sureStringToSaniye(katilim);
                let harcirahSaniye = sureStringToSaniye(harcirah);
                // Katılım barajı
                let katilimTd = '<td class="not-passed">X</td>';
                let harcirahTd = '<td class="not-passed">X</td>';
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                if (enIyiSure !== null && !isNaN(katilimSaniye) && enIyiSure <= katilimSaniye) {
                    katilimTd = `<td class="passed-baraj">${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</td>`;
                }
                if (enIyiSure !== null && !isNaN(harcirahSaniye) && enIyiSure <= harcirahSaniye) {
                    harcirahTd = `<td class="passed-baraj">${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</td>`;
                }
                tbody += katilimTd + harcirahTd;
            });
            tbody += '</tr>';
        });
        $('#brans_sporcu_tbody').html(tbody);
    }

    function renderSporcuBransTablo() {
        let branslar = [...new Set(jsonData.map(x => x["Branş"]))];
        let sporcus = [...new Set(jsonData.map(x => x["Ad Soyad"]))];
        // Başlık
        let thead = '<tr><th>Sporcu</th><th>Katılım Barajı</th><th>Harcırah Barajı</th>';
        branslar.forEach(brans => {
            thead += `<th colspan=2>${brans}</th>`;
        });
        thead += '</tr>';
        thead += '<tr><th></th><th></th><th></th>';
        branslar.forEach(() => {
            thead += '<th>Katılım Barajı</th><th>Harcırah Barajı</th>';
        });
        thead += '</tr>';
        $('#sporcu_brans_thead').html(thead);
        // Satırlar
        let tbody = '';
        sporcus.forEach(sporcu => {
            tbody += `<tr><td>${sporcu}</td><td></td><td></td>`;
            branslar.forEach(brans => {
                let kayitlar = jsonData.filter(x => x["Ad Soyad"] === sporcu && x["Branş"] === brans);
                let cinsiyet = kayitlar.length > 0 ? kayitlar[0]["Cinsiyet"] : 'Erkek';
                let katilim = getBaraj(brans, cinsiyet, 'Katılım');
                let harcirah = getBaraj(brans, cinsiyet, 'Harcırah');
                let katilimSaniye = sureStringToSaniye(katilim);
                let harcirahSaniye = sureStringToSaniye(harcirah);
                // Katılım barajı
                let katilimTd = '<td class="not-passed">X</td>';
                let harcirahTd = '<td class="not-passed">X</td>';
                let enIyi = kayitlar.map(k => sureStringToSaniye(k["Süre"])).filter(s => !isNaN(s));
                let enIyiSure = enIyi.length > 0 ? Math.min(...enIyi) : null;
                if (enIyiSure !== null && !isNaN(katilimSaniye) && enIyiSure <= katilimSaniye) {
                    katilimTd = `<td class="passed-baraj">${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</td>`;
                }
                if (enIyiSure !== null && !isNaN(harcirahSaniye) && enIyiSure <= harcirahSaniye) {
                    harcirahTd = `<td class="passed-baraj">${kayitlar.find(k => sureStringToSaniye(k["Süre"]) === enIyiSure)["Süre"]}</td>`;
                }
                tbody += katilimTd + harcirahTd;
            });
            tbody += '</tr>';
        });
        $('#sporcu_brans_tbody').html(tbody);
    }
}); 