# -*- coding: utf-8 -*-
import streamlit as st
import pandas as pd
import plotly.express as px
import json
from io import BytesIO

st.set_page_config(page_title="Yüzme Performans Dashboard", layout="wide")
st.title("Yüzme Performans Dashboard")
st.markdown("""
Bu sayfa, yüzme yarış sonuçlarını detaylı ve etkileşimli şekilde incelemenizi sağlar. Filtreleri kullanarak istediğiniz sporcu, branş, cinsiyet, yarış ve tarih aralığını seçebilirsiniz. Tüm grafik ve tabloları indirebilirsiniz.
""")

# Veriyi oku
with open('yuzme_sonuclari.json', encoding='utf-8') as f:
    data = json.load(f)
df = pd.DataFrame(data)

# Tarih ve süre işlemleri
df['Tarih'] = pd.to_datetime(df['Tarih'], errors='coerce', dayfirst=True)
def sure_to_seconds(s):
    import re
    if isinstance(s, str):
        if s in ['DNS', 'DSQ']:
            return None
        match = re.match(r"(?:(\d+):)?(\d+)\.(\d+)", s.replace(':', '.'))
        if match:
            groups = match.groups('0')
            dakika = int(groups[0]) if groups[0] else 0
            saniye = int(groups[1])
            salise = int(groups[2])
            return dakika*60 + saniye + salise/100
    return None
df['Süre_saniye'] = df['Süre'].apply(sure_to_seconds)

# Filtreler
sporcular = sorted(df['Ad Soyad'].unique())
branşlar = sorted(df['Branş'].unique())
cinsiyetler = sorted(df['Cinsiyet'].unique())
yarislar = sorted(df['Yarış Adı'].unique()) if 'Yarış Adı' in df.columns else []
tarihler = df['Tarih'].dropna().sort_values().unique()

with st.sidebar:
    st.header('Filtreler')
    sec_sporcu = st.multiselect('Sporcu Seç', sporcular, default=sporcular)
    sec_branş = st.multiselect('Branş Seç', branşlar, default=branşlar)
    sec_cinsiyet = st.multiselect('Cinsiyet Seç', cinsiyetler, default=cinsiyetler)
    sec_yaris = st.multiselect('Yarış Adı Seç', yarislar, default=yarislar) if yarislar else []
    tarih_aralik = st.slider('Tarih Aralığı Seç', min_value=min(tarihler), max_value=max(tarihler), value=(min(tarihler), max(tarihler)))

filtre = (
    df['Ad Soyad'].isin(sec_sporcu) &
    df['Branş'].isin(sec_branş) &
    df['Cinsiyet'].isin(sec_cinsiyet) &
    df['Tarih'].between(tarih_aralik[0], tarih_aralik[1])
)
if yarislar:
    filtre &= df['Yarış Adı'].isin(sec_yaris)
df_filtre = df[filtre]

st.markdown(f"**Toplam Kayıt:** {len(df_filtre)}")

# Genel istatistikler
col1, col2, col3, col4, col5 = st.columns(5)
col1.metric("Sporcu Sayısı", df_filtre['Ad Soyad'].nunique())
col2.metric("Branş Sayısı", df_filtre['Branş'].nunique())
col3.metric("Yarış Sayısı", df_filtre['Yarış Adı'].nunique() if 'Yarış Adı' in df.columns else '-')
col4.metric("Cinsiyet", ', '.join(df_filtre['Cinsiyet'].unique()))
col5.metric("Kayıt Tarih Aralığı", f"{tarih_aralik[0].date()} - {tarih_aralik[1].date()}")

st.info('Filtreleri değiştirerek tüm analizleri anında güncelleyebilirsiniz.')

# Branş bazlı gelişim grafiği ve tablosu
st.subheader('Branş Bazlı Gelişim')
g1 = px.line(df_filtre.dropna(subset=['Süre_saniye']), x='Tarih', y='Süre_saniye', color='Ad Soyad', line_dash='Branş', title='Branş Bazlı Gelişim (Süre - Tarih)')
st.plotly_chart(g1, use_container_width=True)
if len(sec_sporcu) == 1:
    secili_sporcu = sec_sporcu[0]
    sp_df = df_filtre[df_filtre['Ad Soyad'] == secili_sporcu]
    st.dataframe(sp_df[['Branş', 'Tarih', 'Süre', 'Süre_saniye']].sort_values(['Branş', 'Tarih']))
    csv = sp_df.to_csv(index=False).encode('utf-8')
    st.download_button('Bu Tabloyu CSV Olarak İndir', csv, file_name=f'{secili_sporcu}_brans_gelisim.csv', mime='text/csv')

# Genel gelişim
g2 = px.line(df_filtre.dropna(subset=['Süre_saniye']), x='Tarih', y='Süre_saniye', color='Ad Soyad', title='Genel Gelişim (Tüm Branşlar)')
st.plotly_chart(g2, use_container_width=True)

# Branş dağılımı
g3 = px.histogram(df_filtre, y='Branş', color='Cinsiyet', title='Branşlara Göre Yarış Sayısı')
st.plotly_chart(g3, use_container_width=True)

# Cinsiyet dağılımı
g4 = px.pie(df_filtre, names='Cinsiyet', title='Cinsiyet Dağılımı')
st.plotly_chart(g4, use_container_width=True)

# Yaş dağılımı
if 'Doğum Yılı' in df_filtre.columns:
    g5 = px.histogram(df_filtre, x='Doğum Yılı', color='Cinsiyet', title='Yaş Dağılımı (Doğum Yılı)')
    st.plotly_chart(g5, use_container_width=True)

# En iyi dereceler tablosu
en_iyiler = df_filtre.dropna(subset=['Süre_saniye']).groupby(['Ad Soyad', 'Branş'])['Süre_saniye'].min().reset_index()
en_iyiler = en_iyiler.merge(df_filtre, on=['Ad Soyad', 'Branş', 'Süre_saniye'], how='left')
st.subheader('En İyi Dereceler Tablosu')
st.dataframe(en_iyiler[['Ad Soyad', 'Branş', 'Tarih', 'Süre', 'Süre_saniye']].sort_values(['Ad Soyad', 'Branş']))
excel = BytesIO()
en_iyiler.to_excel(excel, index=False)
st.download_button('En İyi Dereceler Tablosunu Excel Olarak İndir', excel.getvalue(), file_name='en_iyi_dereceler.xlsx', mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# DSQ/DNS analizi
dsqs = df_filtre[df_filtre['Süre']=='DSQ'].groupby('Ad Soyad').size()
dnss = df_filtre[df_filtre['Süre']=='DNS'].groupby('Ad Soyad').size()
dsqdns = pd.DataFrame({'DSQ': dsqs, 'DNS': dnss}).fillna(0)
st.subheader('DSQ/DNS Analizi')
st.bar_chart(dsqdns)

# Ham tablo ve indirme
st.subheader('Ham Veriler')
st.dataframe(df_filtre)
csv_all = df_filtre.to_csv(index=False).encode('utf-8')
st.download_button('Filtrelenmiş Veriyi CSV Olarak İndir', csv_all, file_name='filtrelenmis_veri.csv', mime='text/csv')

st.info('Tüm grafikler ve filtreler etkileşimlidir. Her bölümdeki indirme butonları ile verileri dışa aktarabilirsiniz.') 