import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { saveAs } from 'file-saver';

export const generateWordReport = async (video, analysis) => {
  if (!analysis) throw new Error("No analysis available for this video.");

  const createHeading = (text, level = HeadingLevel.HEADING_1) => {
    return new Paragraph({
      text: text,
      heading: level,
      spacing: { before: 400, after: 200 },
    });
  };

  const createText = (text, bold = false) => {
    return new Paragraph({
      children: [new TextRun({ text, bold, size: 24 })],
      spacing: { after: 120 },
    });
  };

  const doc = new Document({
    creator: "MediCast AI",
    title: `Surgical Analysis Report - ${video.title}`,
    description: "Post-operative autonomous surgical video analysis report.",
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "MediCast AI Surgical Analysis Report",
            heading: HeadingLevel.TITLE,
            alignment: "center",
            spacing: { after: 400 },
          }),
          createText(`Procedure: ${video.procedure_type}`, true),
          createText(`Surgeon: ${video.surgeon_name || 'Unknown'}`),
          createText(`Patient ID: ${video.patient_id || 'N/A'}`),
          createText(`Department: ${video.department || 'General'}`),
          createText(`Date: ${video.surgery_date || new Date().toLocaleDateString()}`),
          createText(`Duration: ${video.duration_minutes || 'Unknown'} mins`),
          new Paragraph({ spacing: { after: 400 } }),
          
          createHeading("1. Executive Summary"),
          createText(analysis.summary || "No summary available."),
          
          createHeading("2. Performance Metrics", HeadingLevel.HEADING_2),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [createText("Metric", true)] }),
                  new TableCell({ children: [createText("Score (0-100)", true)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [createText("Overall Score")] }),
                  new TableCell({ children: [createText(String(analysis.overall_score || 0))] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [createText("Safety")] }),
                  new TableCell({ children: [createText(String(analysis.safety_score || 0))] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [createText("Skill & Technique")] }),
                  new TableCell({ children: [createText(String(analysis.skill_score || 0))] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [createText("Efficiency")] }),
                  new TableCell({ children: [createText(String(analysis.efficiency_score || 0))] }),
                ],
              }),
            ],
          }),

          createHeading("3. Risk Events & Safety", HeadingLevel.HEADING_2),
          createText(`Overall Risk Level: ${analysis.risk_level?.toUpperCase() || 'UNKNOWN'}`, true),
          ...(analysis.risk_events || []).map((event) => 
            new Paragraph({
              children: [
                new TextRun({ text: `[${event.timestamp}] `, bold: true }),
                new TextRun({ text: `${event.severity.toUpperCase()} - `, color: event.severity === 'critical' ? 'FF0000' : '000000', bold: true }),
                new TextRun({ text: event.description }),
                new TextRun({ text: `\nRecommendation: ${event.recommendation}`, italics: true }),
              ],
              spacing: { before: 100, after: 100 },
            })
          ),

          createHeading("4. Surgical Phases", HeadingLevel.HEADING_2),
          ...(analysis.phases || []).map((phase) => 
            new Paragraph({
              children: [
                new TextRun({ text: `${phase.name} `, bold: true }),
                new TextRun({ text: `(${phase.start_time} - ${phase.end_time}) | Score: ${phase.score}/100\n`, italics: true }),
                new TextRun({ text: phase.notes }),
              ],
              spacing: { after: 120 },
            })
          ),

          createHeading("5. Technique & Recommendations", HeadingLevel.HEADING_2),
          createText(analysis.technique_assessment || "No assessment available."),
          createHeading("Key Recommendations:", HeadingLevel.HEADING_3),
          ...(analysis.recommendations || []).map((rec) => 
            new Paragraph({
              text: `• ${rec}`,
              spacing: { after: 60 },
            })
          ),

          new Paragraph({
            text: "\nDisclaimer: This report is automatically generated by MediCast AI. It does not replace professional medical judgment.",
            italics: true,
            spacing: { before: 600 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `MediCast_Report_${video.title.replace(/\s+/g, '_')}.docx`);
};
