/**
 * Adaptive layout for GENO single-page A4 PDFs.
 * PDFs are fixed-size documents; "responsive" here means content-aware scaling
 * and flex-based flow so the layout stays balanced across viewers/devices.
 */
import { StyleSheet } from '@react-pdf/renderer';

/** A4 portrait (pt) — reference for density calculations */
export const A4_PAGE = { width: 595.28, height: 841.89 };

const BASE = {
  pagePadH: 16,
  pagePadTop: 12,
  pagePadBottom: 10,
  sectionGap: 3,
  panelGap: 3,
  logoWidth: 118,
  maxGeneRowsCap: 5,
};

/**
 * Estimate vertical load and pick compact / balanced / comfortable density.
 */
export function computeAdaptiveLayout({
  geneRowCount = 0,
  clinicalLineCount = 3,
  methodologyLineCount = 5,
  summaryCharCount = 0,
}) {
  const rows = Math.min(geneRowCount, BASE.maxGeneRowsCap);
  const loadScore =
    rows * 1.15 +
    clinicalLineCount * 0.72 +
    methodologyLineCount * 0.42 +
    summaryCharCount / 115;

  const displayRows = rows > 0 ? rows : 1;

  if (loadScore >= 13) {
    return {
      density: 'compact',
      maxGeneRows: Math.min(3, displayRows),
      fontScale: 0.94,
      spacingScale: 0.84,
      logoWidth: 106,
      summaryMax: 280,
    };
  }

  if (loadScore >= 10) {
    return {
      density: 'balanced',
      maxGeneRows: Math.min(4, displayRows),
      fontScale: 0.97,
      spacingScale: 0.92,
      logoWidth: 112,
      summaryMax: 300,
    };
  }

  return {
    density: 'comfortable',
    maxGeneRows: Math.min(BASE.maxGeneRowsCap, displayRows),
    fontScale: 1,
    spacingScale: 1,
    logoWidth: BASE.logoWidth,
    summaryMax: 320,
  };
}

const scale = (value, factor) => Math.max(1, Math.round(value * factor * 10) / 10);

/**
 * Build react-pdf styles from adaptive layout tokens.
 */
export function createPdfStyles(layout) {
  const fs = (pt) => scale(pt, layout.fontScale);
  const sp = (pt) => scale(pt, layout.spacingScale);

  return StyleSheet.create({
    page: {
      backgroundColor: '#FFFFFF',
      paddingTop: sp(BASE.pagePadTop),
      paddingBottom: sp(BASE.pagePadBottom),
      paddingHorizontal: BASE.pagePadH,
      color: '#000000',
      fontSize: fs(7.5),
      fontFamily: 'Helvetica',
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
    },
    pageInner: {
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
      flexGrow: 1,
    },
    labSubtitle: {
      fontSize: fs(8),
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: '#777777',
      textAlign: 'center',
      marginBottom: sp(3),
      width: '100%',
    },
    headerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: sp(4),
      width: '100%',
    },
    headerLeft: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      flexGrow: 1,
      flexShrink: 1,
      minWidth: '45%',
      maxWidth: '62%',
    },
    logo: {
      width: layout.logoWidth,
      height: 'auto',
      maxWidth: '100%',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flexShrink: 0,
      marginTop: 0,
    },
    riskBoxSpacer: {
      width: sp(6),
    },
    riskLevelBox: {
      paddingVertical: sp(4),
      paddingHorizontal: sp(10),
      borderRadius: 2,
      borderWidth: 1,
      borderColor: '#f35a5a',
      backgroundColor: '#ffe9ea',
      color: '#c52222',
      fontWeight: 'bold',
      fontSize: fs(9),
      textAlign: 'center',
      minWidth: scale(72, layout.fontScale),
    },
    riskLevelBoxLow: {
      borderColor: '#4caf50',
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
    },
    riskLevelCaption: {
      marginTop: 1,
      fontSize: fs(6),
      fontWeight: 'normal',
    },
    riskScoreBox: {
      paddingVertical: sp(4),
      paddingHorizontal: sp(10),
      borderRadius: 2,
      borderWidth: 1,
      borderColor: '#dddddd',
      backgroundColor: '#f9f9f9',
      textAlign: 'center',
      minWidth: scale(72, layout.fontScale),
    },
    riskScoreValue: {
      fontSize: fs(12),
      fontWeight: 'bold',
      color: '#111111',
    },
    riskScoreCaption: {
      marginTop: 1,
      fontSize: fs(6),
      color: '#777777',
    },
    metaStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
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
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '30%',
      minWidth: '28%',
      marginBottom: sp(1),
    },
    metaLabel: {
      fontSize: fs(6),
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: '#999999',
      marginBottom: 1,
    },
    metaValue: {
      fontSize: fs(7.5),
      color: '#111111',
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
      marginBottom: sp(1),
      width: '100%',
    },
    sectionHeader: {
      marginBottom: sp(2),
    },
    sectionTitle: {
      fontSize: fs(7),
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: 0,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    sectionSubtitle: {
      fontSize: fs(7),
      fontWeight: 'bold',
      color: '#333333',
      marginBottom: 0,
      textTransform: 'uppercase',
    },
    bodyText: {
      fontSize: fs(7.5),
      color: '#333333',
      lineHeight: 1.3,
      marginBottom: 0,
      width: '100%',
    },
    clinicalBullet: {
      fontSize: fs(7),
      color: '#333333',
      lineHeight: 1.26,
      marginBottom: sp(1),
      width: '100%',
    },
    sectionRule: {
      borderBottomWidth: 0.5,
      borderBottomColor: '#E8E8E8',
      marginTop: sp(1),
      marginBottom: sp(BASE.sectionGap),
      width: '100%',
    },
    geneTable: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
      marginTop: sp(1),
      width: '100%',
    },
    geneTableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#F5F5F5',
      borderBottomWidth: 1,
      borderBottomColor: '#CCCCCC',
      paddingVertical: sp(3),
      paddingHorizontal: sp(6),
      width: '100%',
    },
    geneTableHeaderCell: {
      fontSize: fs(6),
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
    },
    geneColName: {
      flex: 1.1,
      paddingRight: sp(4),
    },
    geneColExpression: {
      flex: 1,
      paddingRight: sp(4),
    },
    geneColImpact: {
      flex: 1.4,
    },
    geneTableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#E0E0E0',
      paddingVertical: sp(2.5),
      paddingHorizontal: sp(6),
      width: '100%',
      alignItems: 'flex-start',
    },
    geneTableCell: {
      fontSize: fs(7),
      color: '#000000',
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
      paddingVertical: sp(5),
      paddingHorizontal: sp(8),
      backgroundColor: '#FAFAFA',
      marginBottom: sp(BASE.panelGap),
    },
    bottomPanelLast: {
      marginBottom: 0,
    },
    bottomColTitle: {
      fontSize: fs(7),
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: sp(2),
      textTransform: 'uppercase',
      letterSpacing: 0.2,
    },
    bottomBullet: {
      fontSize: fs(6.5),
      color: '#333333',
      lineHeight: 1.24,
      marginBottom: sp(1),
      width: '100%',
    },
    labNoteText: {
      fontSize: fs(6.5),
      color: '#333333',
      lineHeight: 1.26,
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
      fontSize: fs(6),
      color: '#666666',
      lineHeight: 1.2,
    },
  });
}
