import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 45, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 25 },
  subHeader: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  parishTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  address: { fontSize: 9, color: '#555' },
  divider: { marginVertical: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  title: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, letterSpacing: 1 },
  body: { fontSize: 12, lineHeight: 1.8, textAlign: 'justify', marginTop: 10 },
  highlight: { fontWeight: 'bold' },
  footer: { marginTop: 50, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
  signatureBox: { textAlign: 'center', width: 200 },
  dateText: { fontSize: 11, marginBottom: 40 },
  signatureTitle: { fontSize: 11, fontStyle: 'italic' }
});

export interface BattesimoData {
  id: string;
  numero_atto?: number;
  nome: string;
  cognome: string;
  sesso?: string;
  data_nascita: string;
  luogo_nascita: string;
  data_battesimo: string;
  luogo_battesimo?: string;
  ministro: string;
  padre?: string;
  madre?: string;
  domicilio?: string;
  padrino?: string;
  madrina?: string;
  annotazioni?: string;
  // Annotazioni sacramenti posteriori
  cresima_data?: string;
  cresima_luogo?: string;
  cresima_chiesa?: string;
  matrimonio_data?: string;
  matrimonio_coniuge?: string;
  matrimonio_luogo?: string;
  matrimonio_chiesa?: string;
}

export const CertificatoPDF = ({ data }: { data: BattesimoData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.subHeader}>Arcidiocesi di Sassari</Text>
        <Text style={styles.parishTitle}>PARROCCHIA MATER ECCLESIAE</Text>
        <Text style={styles.address}>Via Luna e Sole 1 - 07100 Sassari (SS)</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.title}>ESTRATTO DAL REGISTRO DEI BATTESIMI</Text>

      <Text style={styles.body}>
        Si certifica che <Text style={styles.highlight}>{data.nome} {data.cognome}</Text>, nato/a a{' '}
        <Text style={styles.highlight}>{data.luogo_nascita}</Text> il{' '}
        <Text style={styles.highlight}>{new Date(data.data_nascita).toLocaleDateString('it-IT')}</Text>,
        ha ricevuto il Santo Battesimo in questa Parrocchia in data{' '}
        <Text style={styles.highlight}>{new Date(data.data_battesimo).toLocaleDateString('it-IT')}</Text>.
      </Text>

      {data.ministro && (
        <Text style={[styles.body, { marginTop: 10 }]}>
          Ministro del Sacramento: <Text style={styles.highlight}>{data.ministro}</Text>
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.signatureBox}>
          <Text style={styles.dateText}>
            Sassari, {new Date().toLocaleDateString('it-IT')}
          </Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureTitle}>Il Parroco</Text>
        </View>
      </View>
    </Page>
  </Document>
);