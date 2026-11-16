// Reads a pasted list of agents, one per line, in whatever way it was copied:
//   Ahmed Ali, 0300 1234567
//   Ahmed Ali | Al-Madina Estate | 0300-1234567 | Johar Town
//   Ahmed Ali 03001234567
//   +92 300 1234567 Ahmed Ali
// The phone number is found wherever it is; what is left of the line is the
// name, then (if there is more, separated by , | ; or a tab) the agency and areas.

export interface ParsedAgent {
  name: string;
  phone: string;
  agency?: string;
  area?: string;
}

export interface ParsedAgentLine {
  line: number;
  raw: string;
  agent?: ParsedAgent;
  error?: string;
}

const PHONE = /(\+?\d[\d\s\-().]{8,}\d)/;

export function parseAgentList(text: string): ParsedAgentLine[] {
  const out: ParsedAgentLine[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const m = PHONE.exec(line);
    if (!m) {
      out.push({ line: i + 1, raw: line, error: "no phone number found" });
      return;
    }
    const phone = m[1].trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      out.push({ line: i + 1, raw: line, error: "the phone number does not look right" });
      return;
    }
    const rest = (line.slice(0, m.index) + " | " + line.slice(m.index + m[0].length))
      .split(/[,|;\t]/)
      .map((s) => s.replace(/^[\s\-:]+|[\s\-:]+$/g, ""))
      .filter(Boolean);
    const name = rest[0];
    if (!name) {
      out.push({ line: i + 1, raw: line, error: "no name found" });
      return;
    }
    // Everything after the agency is the area(s), e.g. "Wapda Town, Valencia".
    const area = rest.slice(2).join(", ");
    out.push({ line: i + 1, raw: line, agent: { name, phone, agency: rest[1] || undefined, area: area || undefined } });
  });
  return out;
}
