/**
 * Adaptive layout for GENO single-page A4 PDFs.
 * Tuned for mobile PDF viewers: larger type floors, vertical stacking,
 * and row limits instead of shrinking text below readable sizes.
 */
import { StyleSheet } from '@react-pdf/renderer';

/** A4 portrait (pt) */
export const A4_PAGE = { width: 595.28, height: 841.89 };

/**
 * Minimum font sizes (pt) — stay legible when a phone fits the page to screen width.
 */
const FONT_MIN = {
  caption: 7,
  body: 8,
  table: 8,
  tableHeader: 7.5,
  section: 8,
  panelTitle: 8,
  riskCaption: 7,
  riskLevel: 10,
  riskValue: 15,
  subtitle: 8.5,
};

const BASE = {
  pagePadH: 22,
  pagePadTop: 11,
  pagePadBottom: 9,
  sectionGap: 3,
  panelGap: 3,
  logoWidth: 100,
  maxGeneRowsCap: 4,
};

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Content-aware density — never scales type below 1.0; trims rows/spacing instead.
 */
export function computeAdaptiveLayout({
  geneRowCount = 0,
  clinicalLineCount = 3,
  methodologyLineCount = 5,
  summaryCharCount = 0,
}) {
  const rows = Math.min(geneRowCount, BASE.maxGeneRowsCap);
  const loadScore =
    rows * 1.12 +
    clinicalLineCount * 0.68 +
    methodologyLineCount * 0.4 +
    summaryCharCount / 120;

  const displayRows = rows > 0 ? rows : 1;

  if (loadScore >= 12.5) {
    return {
      density: 'compact',
      maxGeneRows: Math.min(3, displayRows),
      typeScale: 1,
      spacingScale: 0.86,
      logoWidth: 92,
      summaryMax: 260,
    };
  }

  if (loadScore >= 9.5) {
    return {
      density: 'balanced',
      maxGeneRows: Math.min(4, displayRows),
      typeScale: 1,
      spacingScale: 0.93,
      logoWidth: 96,
      summaryMax: 290,
    };
  }

  return {
    density: 'comfortable',
    maxGeneRows: Math.min(BASE.maxGeneRowsCap, displayRows),
    typeScale: 1.04,
    spacingScale: 1,
    logoWidth: BASE.logoWidth,
    summaryMax: 300,
  };
}

const scale = (value, factor) => Math.max(1, round1(value * factor));

/** Map base pt sizes to FONT_MIN keys for flooring */
const PT_KEYS = {
  6: 'caption',
  6.5: 'caption',
  7: 'section',
  7.5: 'body',
  8: 'body',
  8.5: 'subtitle',
  9: 'riskLevel',
  12: 'riskValue',
  16: 'riskValue',
};

const fs = (pt, layout) => {
  const key = PT_KEYS[pt];
  const scaled = pt * layout.typeScale;
  if (key && FONT_MIN[key]) {
    return round1(Math.max(scaled, FONT_MIN[key]));
  }
  return round1(Math.max(scaled, FONT_MIN.body));
};

/**
 * Build react-pdf styles from adaptive layout tokens.
 */
export function createPdfStyles(layout) {
  const sp = (pt) => scale(pt, layout.spacingScale);

  return StyleSheet.create({
    page: {
      backgroundColor: '#FFFFFF',
      paddingTop: sp(BASE.pagePadTop),
      paddingBottom: sp(BASE.pagePadBottom),
      paddingHorizontal: BASE.pagePadH,
      color: '#000000',
      fontSize: fs(8, layout),
      fontFamily: 'Helvetica',
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
    },
    pageInner: {
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
      maxWidth: '100%',
    },
    labSubtitle: {
      fontSize: fs(8.5, layout),
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: '#777777',
      textAlign: 'center',
      marginBottom: sp(3),
      width: '100%',
    },
    headerBlock: {
      width: '100%',
      marginBottom: sp(4),
      alignItems: 'center',
    },
    logoRow: {
      width: '100%',
      alignItems: 'center',
      marginBottom: sp(4),
    },
    logo: {
      width: layout.logoWidth,
      height: 'auto',
    },
    riskHeroRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'stretch',
      width: '100%',
    },
    riskBoxSpacer: {
      width: sp(8),
    },
    riskLevelBox: {
      paddingVertical: sp(5),
      paddingHorizontal: sp(12),
      borderRadius: 3,
      borderWidth: 1,
      borderColor: '#f35a5a',
      backgroundColor: '#ffe9ea',
      color: '#c52222',
      fontWeight: 'bold',
      fontSize: fs(10, layout),
      textAlign: 'center',
      minWidth: scale(88, layout.typeScale),
    },
    riskLevelBoxLow: {
      borderColor: '#4caf50',
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
    },
    riskLevelCaption: {
      marginTop: 2,
      fontSize: fs(7, layout),
      fontWeight: 'normal',
    },
    riskScoreBox: {
      paddingVertical: sp(5),
      paddingHorizontal: sp(12),
      borderRadius: 3,
      borderWidth: 1,
      borderColor: '#dddddd',
      backgroundColor: '#f9f9f9',
      textAlign: 'center',
      minWidth: scale(88, layout.typeScale),
    },
    riskScoreValue: {
      fontSize: fs(16, layout),
      fontWeight: 'bold',
      color: '#111111',
    },
    riskScoreCaption: {
      marginTop: 2,
      fontSize: fs(7, layout),
      color: '#777777',
    },
    metaStrip: {
      flexDirection: 'column',
      backgroundColor: '#fafafa',
      borderWidth: 1,
      borderColor: '#eeeeee',
      borderRadius: 4,
      paddingVertical: sp(4),
      paddingHorizontal: sp(10),
      marginBottom: sp(4),
      width: '100%',
    },
    metaItem: {
      width: '100%',
      marginBottom: sp(2),
      paddingBottom: sp(2),
      borderBottomWidth: 0.5,
      borderBottomColor: '#EEEEEE',
    },
    metaItemLast: {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottomWidth: 0,
    },
    metaLabel: {
      fontSize: fs(7, layout),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: '#999999',
      marginBottom: 1,
      fontWeight: 'bold',
    },
    metaValue: {
      fontSize: fs(8, layout),
      color: '#111111',
      lineHeight: 1.28,
    },
    reportBody: {
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
    },
    section: {
      marginBottom: sp(BASE.sectionGap),
      width: '100%',
    },
    sectionTight: {
      marginBottom: sp(2),
      width: '100%',
    },
    sectionHeader: {
      marginBottom: sp(2),
      paddingBottom: sp(1),
      borderBottomWidth: 0.5,
      borderBottomColor: '#E0E0E0',
    },
    sectionTitle: {
      fontSize: fs(7.5, layout),
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: 1,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    sectionSubtitle: {
      fontSize: fs(8, layout),
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: 0,
      textTransform: 'uppercase',
    },
    bodyText: {
      fontSize: fs(8, layout),
      color: '#333333',
      lineHeight: 1.35,
      marginBottom: 0,
      width: '100%',
    },
    clinicalBullet: {
      fontSize: fs(8, layout),
      color: '#333333',
      lineHeight: 1.32,
      marginBottom: sp(2),
      width: '100%',
      paddingLeft: 2,
    },
    sectionRule: {
      borderBottomWidth: 0.5,
      borderBottomColor: '#E0E0E0',
      marginTop: sp(1),
      marginBottom: sp(BASE.sectionGap),
      width: '100%',
    },
    geneTable: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
      marginTop: sp(2),
      width: '100%',
    },
    geneTableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#F0F0F0',
      borderBottomWidth: 1,
      borderBottomColor: '#CCCCCC',
      paddingVertical: sp(3.5),
      paddingHorizontal: sp(6),
      width: '100%',
    },
    geneTableHeaderCell: {
      fontSize: fs(7.5, layout),
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
    },
    geneColName: {
      flex: 1,
      paddingRight: sp(3),
    },
    geneColExpression: {
      flex: 0.9,
      paddingRight: sp(3),
    },
    geneColImpact: {
      flex: 1.1,
    },
    geneTableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#E0E0E0',
      paddingVertical: sp(3),
      paddingHorizontal: sp(6),
      width: '100%',
      alignItems: 'flex-start',
    },
    geneTableCell: {
      fontSize: fs(8, layout),
      color: '#000000',
      lineHeight: 1.28,
    },
    supplementaryBlock: {
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
    },
    bottomPanel: {
      width: '100%',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 3,
      paddingVertical: sp(6),
      paddingHorizontal: sp(9),
      backgroundColor: '#FAFAFA',
      marginBottom: sp(BASE.panelGap),
    },
    bottomPanelLast: {
      marginBottom: 0,
    },
    bottomColTitle: {
      fontSize: fs(8, layout),
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: sp(3),
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingBottom: sp(1),
      borderBottomWidth: 0.5,
      borderBottomColor: '#E8E8E8',
    },
    bottomBullet: {
      fontSize: fs(7.5, layout),
      color: '#333333',
      lineHeight: 1.3,
      marginBottom: sp(1.5),
      width: '100%',
    },
    labNoteText: {
      fontSize: fs(7.5, layout),
      color: '#333333',
      lineHeight: 1.32,
      width: '100%',
    },
    footer: {
      marginTop: sp(4),
      paddingTop: sp(3),
      borderTopWidth: 0.5,
      borderTopColor: '#E0E0E0',
      textAlign: 'center',
      width: '100%',
    },
    footerText: {
      fontSize: fs(7, layout),
      color: '#666666',
      lineHeight: 1.28,
    },
  });
}
