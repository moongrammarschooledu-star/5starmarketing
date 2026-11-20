import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  Paragraph,
  Tab,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

// Turns an agreement (rent / sale) into a Word (.docx) file the office can edit and print.
// Same wording and layout idea as the print page: Urdu is one justified paragraph with numbered
// terms; English is a numbered list. Company letterhead paper = A4 with a page border;
// stamp paper = Legal with the top of the first page left empty for the stamp.

export interface DocxSignatory {
  /** "العبد" (Urdu) or "Owner" / "Tenant" / "Witness 1" (English). */
  label: string;
  name: string;
  /** e.g. (مالک مذکور) - printed after the name. */
  role?: string;
  cnic?: string;
  cnicLabel?: string;
}

export interface AgreementDocxModel {
  lang: "ur" | "en";
  stamp: boolean;
  title: string;
  /** Smaller second part of an Urdu title ("کرایہ داری"). */
  titleSmall?: string;
  intro: string[];
  clauses: string[];
  extra: string[];
  closing: string;
  /** Printed in bold wherever they appear (the parties' names). */
  names: string[];
  parties: DocxSignatory[];
  witnesses: DocxSignatory[];
  letterhead: { name: string; lines: string[] };
  footer: string;
  /** Company logo (PNG). Left out if it could not be loaded. */
  logo?: Buffer;
}

const UR_FONT = "Jameel Noori Nastaleeq";
const EN_FONT = "Times New Roman";
const TWIP_PER_MM = 1440 / 25.4;
const mm = (n: number) => Math.round(n * TWIP_PER_MM);

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function agreementDocxFileName(prefix: string, no: string): string {
  return `${prefix}-${no}.docx`;
}

export async function buildAgreementDocx(m: AgreementDocxModel): Promise<Buffer> {
  const ur = m.lang === "ur";
  const font = ur ? UR_FONT : EN_FONT;
  const body = ur ? 26 : 23; // half-points

  const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({
      text,
      font: { ascii: font, hAnsi: font, cs: font },
      bold: o.bold,
      boldComplexScript: o.bold,
      size: o.size ?? body,
      sizeComplexScript: o.size ?? body,
      color: o.color,
      rightToLeft: ur,
    });

  // Splits text so the parties' names come out bold.
  const withNames = (text: string, size?: number): TextRun[] => {
    const names = m.names.filter(Boolean);
    if (!names.length) return [run(text, { size })];
    const parts = text.split(new RegExp(`(${names.map(esc).join("|")})`));
    return parts.filter((p) => p !== "").map((p) => run(p, { size, bold: names.includes(p) }));
  };

  const paragraph = (children: TextRun[], o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number; line?: number; keepNext?: boolean } = {}) =>
    new Paragraph({
      children,
      bidirectional: ur,
      alignment: o.align ?? AlignmentType.BOTH,
      spacing: { after: o.after ?? 60, before: o.before ?? 0, line: o.line ?? (ur ? 400 : 300) },
      keepNext: o.keepNext,
    });

  const blocks: (Paragraph | Table)[] = [];

  if (m.stamp) blocks.push(new Paragraph({ spacing: { before: mm(58) }, children: [] }));

  // title in a double-line box
  const titleRuns = ur
    ? [run(m.title, { bold: true, size: 48 }), ...(m.titleSmall ? [run(` ${m.titleSmall}`, { bold: true, size: 30 })] : [])]
    : [run(m.title, { bold: true, size: 32 })];
  const box = { style: BorderStyle.DOUBLE, size: 6, space: 4, color: "1A1A1A" };
  blocks.push(
    new Paragraph({
      children: titleRuns,
      bidirectional: ur,
      alignment: AlignmentType.CENTER,
      spacing: { after: 160, before: 60 },
      border: { top: box, bottom: box, left: box, right: box },
    })
  );

  for (const p of m.intro) blocks.push(paragraph(withNames(p)));

  if (ur) {
    // Urdu: the terms run on as one justified paragraph, each starting with its number.
    const runs: TextRun[] = [];
    m.clauses.forEach((c, i) => {
      runs.push(run(`${i + 1})..`, { bold: true }), run(` ${c} `));
    });
    m.extra.forEach((x, i) => {
      runs.push(run(`${m.clauses.length + i + 1})..`, { bold: true }), run(` ${x} `));
    });
    runs.push(run(m.closing));
    blocks.push(paragraph(runs, { after: 120 }));
  } else {
    const list = [...m.clauses, ...m.extra];
    list.forEach((c, i) => {
      blocks.push(
        new Paragraph({
          children: [run(`${i + 1}.`, { bold: true }), new TextRun({ children: [new Tab()] }), run(c)],
          tabStops: [{ type: TabStopType.LEFT, position: 520 }],
          indent: { left: 520, hanging: 520 },
          alignment: AlignmentType.BOTH,
          spacing: { after: 70, line: 300 },
        })
      );
    });
    blocks.push(paragraph([run(m.closing)], { before: 120, after: 120 }));
  }

  // signatures: owner / tenant, then the witnesses (2 per row, no lines or borders)
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  const sigCell = (s: DocxSignatory | undefined, witness: boolean) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: { top: none, bottom: none, left: none, right: none },
      children: s
        ? [
            new Paragraph({ children: [run(s.label, { bold: true, size: witness ? 22 : ur ? 28 : 24 })], bidirectional: ur, alignment: AlignmentType.CENTER, spacing: { after: witness ? 120 : 380 }, keepNext: true }),
            new Paragraph({
              children: [run(s.name, { bold: true, size: witness ? 22 : 24 }), ...(s.role ? [run(` ${s.role}`, { size: witness ? 20 : 22 })] : [])],
              bidirectional: ur,
              alignment: AlignmentType.CENTER,
              spacing: { after: 20 },
              keepNext: true,
            }),
            ...(s.cnic ? [new Paragraph({ children: [run(`${s.cnicLabel ?? "CNIC:"} ${s.cnic}`, { size: 19, color: "444444" })], bidirectional: ur, alignment: AlignmentType.CENTER, spacing: { after: 20 } })] : []),
          ]
        : [new Paragraph({ children: [] })],
    });
  const sigRows = (list: DocxSignatory[], witness: boolean) => {
    const rows: TableRow[] = [];
    for (let i = 0; i < list.length; i += 2) {
      rows.push(new TableRow({ cantSplit: true, children: [sigCell(list[i], witness), sigCell(list[i + 1], witness)] }));
    }
    return rows;
  };
  const sigRowsAll = [...sigRows(m.parties, false), ...sigRows(m.witnesses, true)];
  if (sigRowsAll.length) {
    blocks.push(
      new Table({
        rows: sigRowsAll,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        visuallyRightToLeft: ur,
      })
    );
  }

  // company letterhead (plain paper) and footer
  const redRule = { style: BorderStyle.DOUBLE, size: 6, space: 4, color: "C81E2C" };
  const headerChildren: Paragraph[] = [];
  if (!m.stamp) {
    if (m.logo) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new ImageRun({ type: "png", data: m.logo, transformation: { width: 150, height: 75 }, altText: { title: "Logo", description: "Company logo", name: "logo" } })],
        })
      );
    }
    headerChildren.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, bidirectional: ur, children: [run(m.letterhead.name, { bold: true, size: ur ? 38 : 32 })] }),
      ...m.letterhead.lines.map(
        (l, i, arr) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            bidirectional: ur,
            border: i === arr.length - 1 ? { bottom: redRule } : undefined,
            children: [run(l, { size: 19, color: "444444" })],
          })
      )
    );
  }
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: ur,
        border: { top: { style: BorderStyle.SINGLE, size: 6, space: 3, color: "C81E2C" } },
        children: [run(m.footer, { size: 16, color: "555555" })],
      }),
    ],
  });

  const edge = { style: BorderStyle.DOUBLE, size: 6, color: "1A1A1A", space: 22 };
  const doc = new Document({
    creator: "5STAR.M Estate & Builders",
    title: m.title,
    styles: { default: { document: { run: { font: { ascii: font, hAnsi: font, cs: font }, size: body } } } },
    sections: [
      {
        properties: {
          page: {
            size: m.stamp ? { width: mm(215.9), height: mm(355.6) } : { width: mm(210), height: mm(297) },
            margin: { top: m.stamp ? mm(14) : mm(10), bottom: mm(20), left: mm(19), right: mm(19), header: mm(9), footer: mm(9) },
            ...(m.stamp
              ? {}
              : {
                  borders: {
                    pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE },
                    pageBorderTop: edge,
                    pageBorderBottom: edge,
                    pageBorderLeft: edge,
                    pageBorderRight: edge,
                  },
                }),
          },
        },
        headers: m.stamp ? undefined : { default: new Header({ children: headerChildren }) },
        footers: { default: footer },
        children: blocks,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
