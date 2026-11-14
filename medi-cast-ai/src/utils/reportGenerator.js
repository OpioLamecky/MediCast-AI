import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * MediCast AI Comprehensive Surgical Intelligence & Operative Audit Report Generator
 * Generates an exhaustive, multi-page (2-3 pages) clinical Word document with dense,
 * evidence-grounded performance telemetry, surgical phase chronologies, safety assessments,
 * and post-operative pharmacotherapy regimens.
 */

// ─────────────────────────────────────────────────────────────
// Styling Constants & Color Palette
// ─────────────────────────────────────────────────────────────
const COLORS = {
  PRIMARY_TEAL: "0F766E",       // Deep Surgical Teal
  TEAL_LIGHT: "CCFBF1",         // Light Teal accent
  TEAL_ACCENT: "0D9488",        // Bright Teal
  NAVY_DARK: "0F172A",          // Dark Slate Navy
  SLATE_BODY: "334155",         // Body text slate
  SLATE_MUTED: "64748B",        // Subtext slate
  BORDER_LIGHT: "CBD5E1",       // Subtle border
  BG_ZEBRA: "F8FAFC",           // Light table row zebra
  HEADER_BG: "0F766E",          // Table header teal
  WHITE: "FFFFFF",
  SEV_LOW: "047857",            // Emerald green
  SEV_MOD: "D97706",            // Amber
  SEV_HIGH: "DC2626",           // Red
};

const tableBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: COLORS.BORDER_LIGHT,
};

const cellBorders = {
  top: tableBorder,
  bottom: tableBorder,
  left: tableBorder,
  right: tableBorder,
};

const cellMargins = {
  top: 120,    // 6pt
  bottom: 120,
  left: 160,   // 8pt
  right: 160,
};

// ─────────────────────────────────────────────────────────────
// Document Helper Functions
// ─────────────────────────────────────────────────────────────
function createTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 80 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 32, // 16pt
        color: COLORS.NAVY_DARK,
        font: "Arial"
      })
    ]
  });
}

function createSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 20, // 10pt
        color: COLORS.PRIMARY_TEAL,
        font: "Arial"
      })
    ]
  });
}

function createSectionHeading(title, number = "") {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text: number ? `${number}. ` : "",
        bold: true,
        size: 24, // 12pt
        color: COLORS.PRIMARY_TEAL,
        font: "Arial"
      }),
      new TextRun({
        text: title,
        bold: true,
        size: 24,
        color: COLORS.NAVY_DARK,
        font: "Arial"
      })
    ]
  });
}

function createSubSectionHeading(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 21, // 10.5pt
        color: COLORS.PRIMARY_TEAL,
        font: "Arial"
      })
    ]
  });
}

function createParagraph(text, options = {}) {
  const { bold = false, italics = false, color = COLORS.SLATE_BODY, size = 20, after = 120 } = options;
  return new Paragraph({
    spacing: { after },
    children: [
      new TextRun({
        text,
        bold,
        italics,
        color,
        size,
        font: "Arial"
      })
    ]
  });
}

function createCell(content, options = {}) {
  const {
    bold = false,
    header = false,
    color = header ? COLORS.WHITE : COLORS.NAVY_DARK,
    bgColor = header ? COLORS.HEADER_BG : undefined,
    width = undefined,
    align = AlignmentType.LEFT,
    size = 19
  } = options;

  let children = [];
  if (Array.isArray(content)) {
    children = content;
  } else {
    children = [
      new Paragraph({
        alignment: align,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: String(content ?? ''),
            bold: bold || header,
            color,
            size,
            font: "Arial"
          })
        ]
      })
    ];
  }

  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: bgColor ? { fill: bgColor } : undefined,
    borders: cellBorders,
    margins: cellMargins,
    children
  });
}

// ─────────────────────────────────────────────────────────────
// Main Report Generator Export
// ─────────────────────────────────────────────────────────────

export const generateWordReport = async (video, analysis) => {
  const toSec = (t = '') => { const m = String(t).match(/(\d+):(\d+)/); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
  const phases = [...(analysis?.phases || [])].sort((a, b) => toSec(a.time || a.timestamp) - toSec(b.time || b.timestamp));
  const risks = [...(analysis?.risk_events || analysis?.safety_flags || [])].sort((a, b) => toSec(a.timestamp || a.time) - toSec(b.timestamp || b.time));
  const title = video?.title || 'Surgical Case Analysis';
  const cell = (txt, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(txt || ''), bold, size: 19 })] })] });
  const row = (cols, bold = false) => new TableRow({ children: cols.map(c => cell(c, bold)) });
  const h = (txt) => new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: txt, bold: true, size: 23, color: '1B675A' })] });
  const p = (txt) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: String(txt || ''), size: 20 })] });
  const children = [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'MEDICAST AI  CLINICAL OPERATIVE AUDIT', bold: true, size: 28, color: '1B675A' })] }),
    p(`Case: ${title} | Procedure: ${analysis?.procedure_type || video?.procedure || 'General'} | Date: ${new Date().toISOString().slice(0, 10)} | Safety: ${analysis?.safety_score ?? '--'}/100`),
    h('1. Executive Summary'), p(analysis?.executive_summary || analysis?.summary || 'No summary provided.'),
    h('2. Chronological Surgical Phases'),
    phases.length ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(['Time', 'Phase', 'Score', 'Notes'], true), ...phases.map(x => row([x.time || x.timestamp || '--', x.phase || x.name || 'Phase', x.score ?? '--', x.notes || x.description || '']))] }) : p('No phase timestamps recorded.'),
    h('3. Chronological Safety & Risk Events'),
    risks.length ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(['Time', 'Severity', 'Observation', 'Mitigation'], true), ...risks.map(x => row([x.timestamp || x.time || '--', x.severity || 'INFO', x.description || x.message || '', x.mitigation || 'Clinician review']))] }) : p('No safety events flagged.'),
    h('4. Recommendations & Governance'),
    ...(analysis?.recommendations || ['Routine post-operative monitoring per hospital protocol.']).map(r => p(` ${r}`)),
    p('Notice: Algorithmic decision-support output for clinician review only. Not an autonomous diagnostic device.')
  ];
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${title.replace(/[^a-z0-9]+/gi, '_')}_Clinical_Report.docx`; a.click(); URL.revokeObjectURL(url);
};

export const generatePdfReport = (video, analysis) => {
  const toSec = (t = "") => { const m = String(t).match(/(\d+):(\d+)/); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
  const phases = [...(analysis?.phases || [])].sort((a, b) => toSec(a.time || a.timestamp) - toSec(b.time || b.timestamp));
  const risks = [...(analysis?.risk_events || analysis?.safety_flags || [])].sort((a, b) => toSec(a.timestamp || a.time) - toSec(b.timestamp || b.time));
  const title = video?.title || "Surgical Case Analysis";
  const recs = (analysis?.recommendations || ["Routine post-operative monitoring per hospital protocol."]).map(r => `<li>${r}</li>`).join("");
  const pRows = phases.map(x => `<tr><td>${x.time || x.timestamp || "--"}</td><td><strong>${x.phase || x.name || "Phase"}</strong></td><td>${x.score ?? "--"}</td><td>${x.notes || x.description || ""}</td></tr>`).join("");
  const rRows = risks.map(x => `<tr><td>${x.timestamp || x.time || "--"}</td><td>${x.severity || "INFO"}</td><td>${x.description || x.message || ""}</td><td>${x.mitigation || "Clinician review"}</td></tr>`).join("");
  const html = `<!doctype html><html><head><title>${title}</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#1c1917;font-size:10.5pt;line-height:1.4}.hdr{border-bottom:3px solid #1b675a;padding-bottom:6px;margin-bottom:12px;display:flex;justify-content:space-between}h1{font-size:15pt;color:#1b675a;margin:0}h2{font-size:11.5pt;color:#1b675a;margin:12px 0 4px;border-bottom:1px solid #e7e5e4}table{width:100%;border-collapse:collapse;font-size:9pt;margin-top:4px}th,td{border:1px solid #d6d3d1;padding:5px 7px;text-align:left}th{background:#f0fdfa}.warn{margin-top:14px;padding:7px;background:#fffbeb;border:1px solid #fde68a;font-size:8.5pt}</style></head><body><div class="hdr"><h1>MediCast AI  Clinical Operative Audit</h1><span>${new Date().toISOString().slice(0,10)}</span></div><p><strong>Case:</strong> ${title} | <strong>Procedure:</strong> ${analysis?.procedure_type || video?.procedure || "General"} | <strong>Safety:</strong> ${analysis?.safety_score ?? "--"}/100</p><h2>1. Executive Summary</h2><p>${analysis?.executive_summary || analysis?.summary || "No summary provided."}</p><h2>2. Chronological Surgical Phases</h2>${pRows ? `<table><thead><tr><th>Time</th><th>Phase</th><th>Score</th><th>Notes</th></tr></thead><tbody>${pRows}</tbody></table>` : "<p>No phase timestamps recorded.</p>"}<h2>3. Chronological Safety & Risk Events</h2>${rRows ? `<table><thead><tr><th>Time</th><th>Severity</th><th>Observation</th><th>Mitigation</th></tr></thead><tbody>${rRows}</tbody></table>` : "<p>No safety events flagged.</p>"}<h2>4. Recommendations</h2><ul>${recs}</ul><div class="warn">Notice: Algorithmic decision-support output for clinician review only. Not an autonomous diagnostic device.</div></body></html>`;
  const f = document.createElement("iframe"); f.style.display = "none"; document.body.appendChild(f);
  f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 250);
};
