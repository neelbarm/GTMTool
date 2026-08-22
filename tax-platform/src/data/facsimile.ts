import type { DocKind, Facsimile, FacsimileBox } from "@/lib/types";

/* ============================================================================
   Source documents are drawn, not photographed.

   Every box carries a percentage rect, so the review pane can highlight the
   exact region a figure was read from at any zoom level, and the highlight
   stays correct on a phone. That is the whole trick behind Challenge 01: the
   link between a return field and its source is a coordinate, not a filename.
   ========================================================================== */

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type BoxSpec = [id: string, label: string, value: string, x: number, y: number, w: number, h: number];

const box = ([id, label, value, x, y, w, h]: BoxSpec, mono = true): FacsimileBox => ({
  id,
  label,
  value,
  mono,
  rect: { x, y, w, h },
});

/* --- W-2 ------------------------------------------------------------------ */

export function w2Facsimile(args: {
  employer: string;
  employerAddress: string;
  ein: string;
  employee: string;
  ssn: string;
  wages: number;
  fedWithheld: number;
  ssWages: number;
  ssTax: number;
  medWages: number;
  medTax: number;
  code12: string;
  amount12: number;
  state: string;
  stateWages: number;
  stateTax: number;
  year: number;
}): Facsimile {
  return {
    title: `Form W-2  Wage and Tax Statement`,
    subtitle: `${args.year}`,
    omb: "OMB No. 1545-0008",
    boxes: [
      box(["b", "b  Employer identification number (EIN)", args.ein, 4, 9, 44, 8]),
      box(["c", "c  Employer's name, address, and ZIP code", `${args.employer}\n${args.employerAddress}`, 4, 18, 44, 15], false),
      box(["a", "a  Employee's social security number", args.ssn, 52, 9, 44, 8]),
      box(["e", "e  Employee's name and address", args.employee, 4, 34, 44, 12], false),
      box(["1", "1  Wages, tips, other compensation", money(args.wages), 52, 18, 22, 8]),
      box(["2", "2  Federal income tax withheld", money(args.fedWithheld), 75, 18, 21, 8]),
      box(["3", "3  Social security wages", money(args.ssWages), 52, 27, 22, 8]),
      box(["4", "4  Social security tax withheld", money(args.ssTax), 75, 27, 21, 8]),
      box(["5", "5  Medicare wages and tips", money(args.medWages), 52, 36, 22, 8]),
      box(["6", "6  Medicare tax withheld", money(args.medTax), 75, 36, 21, 8]),
      box(["12a", "12a  See instructions for box 12", `${args.code12}   ${money(args.amount12)}`, 52, 45, 22, 8]),
      box(["13", "13  Statutory / Retirement / Third-party", "☐   ☑   ☐", 75, 45, 21, 8], false),
      box(["15", "15  State / Employer's state ID no.", `${args.state}   84-2201993`, 4, 62, 30, 8]),
      box(["16", "16  State wages, tips, etc.", money(args.stateWages), 35, 62, 30, 8]),
      box(["17", "17  State income tax", money(args.stateTax), 66, 62, 30, 8]),
      box(["18", "18  Local wages, tips, etc.", money(args.stateWages), 4, 71, 30, 8]),
      box(["19", "19  Local income tax", "0.00", 35, 71, 30, 8]),
      box(["20", "20  Locality name", "—", 66, 71, 30, 8]),
      box([
        "copy",
        "Copy B",
        "To be filed with the employee's FEDERAL tax return. This information is being furnished to the Internal Revenue Service.",
        4,
        81,
        92,
        9,
      ], false),
    ],
  };
}

/* --- 1099 family ---------------------------------------------------------- */

export function form1099Facsimile(args: {
  variant: string;
  payer: string;
  payerAddress: string;
  tin: string;
  recipient: string;
  year: number;
  rows: { id: string; label: string; value: string }[];
}): Facsimile {
  const boxes: FacsimileBox[] = [
    box(["payer", "PAYER'S name, street address, city, state, ZIP", `${args.payer}\n${args.payerAddress}`, 4, 12, 44, 18], false),
    box(["tin", "PAYER'S TIN", args.tin, 4, 32, 21, 8]),
    box(["rtin", "RECIPIENT'S TIN", "***-**-4417", 26, 32, 22, 8]),
    box(["recipient", "RECIPIENT'S name and address", args.recipient, 4, 42, 44, 12], false),
  ];
  args.rows.forEach((r, i) => {
    boxes.push(box([r.id, r.label, r.value, 52, 12 + i * 9, 44, 8]));
  });
  return {
    title: `Form ${args.variant}`,
    subtitle: `${args.year}`,
    omb: "OMB No. 1545-0112",
    boxes,
  };
}

/* --- A generic statement, for the long tail of documents ------------------ */

export function statementFacsimile(args: {
  title: string;
  issuer: string;
  year: number;
  rows: { id: string; label: string; value: string }[];
  note?: string;
}): Facsimile {
  const boxes: FacsimileBox[] = [
    box(["issuer", "Issued by", `${args.issuer}\nTax year ${args.year}`, 4, 12, 92, 12], false),
  ];
  args.rows.forEach((r, i) => {
    boxes.push(box([r.id, r.label, r.value, 4, 28 + i * 10, 92, 9], true));
  });
  if (args.note) {
    boxes.push(box(["note", "Note", args.note, 4, 28 + args.rows.length * 10 + 4, 92, 12], false));
  }
  return { title: args.title, subtitle: `${args.year}`, omb: "", boxes };
}

/* --- Fallback used by the generated long-tail documents ------------------- */

const KIND_ROWS: Partial<Record<DocKind, [string, string][]>> = {
  "1099-INT": [["1", "Interest income"], ["4", "Federal income tax withheld"]],
  "1099-DIV": [["1a", "Total ordinary dividends"], ["1b", "Qualified dividends"], ["2a", "Total capital gain distr."]],
  "1099-NEC": [["1", "Nonemployee compensation"], ["4", "Federal income tax withheld"]],
  "1099-MISC": [["3", "Other income"], ["4", "Federal income tax withheld"]],
  "1099-R": [["1", "Gross distribution"], ["2a", "Taxable amount"], ["4", "Federal income tax withheld"]],
  "1098": [["1", "Mortgage interest received"], ["5", "Mortgage insurance premiums"]],
  "1098-T": [["1", "Payments received for qualified tuition"], ["5", "Scholarships or grants"]],
  "1095-A": [["33A", "Annual enrollment premiums"], ["33B", "Annual SLCSP premium"], ["33C", "Annual advance payment of PTC"]],
  "K-1": [["1", "Ordinary business income (loss)"], ["2", "Net rental real estate income"], ["16", "Foreign transactions"]],
  "Property tax": [["a", "Assessed value"], ["b", "Total tax levied"]],
  "Charity letter": [["a", "Total contributions"], ["b", "Goods or services provided"]],
  Receipt: [["a", "Amount"], ["b", "Category"]],
  "Bank statement": [["a", "Closing balance"], ["b", "Interest paid"]],
  "Mileage log": [["a", "Business miles"], ["b", "Total miles"]],
  "Depreciation schedule": [["a", "Basis"], ["b", "Current-year depreciation"]],
  "1099-B": [["1d", "Proceeds"], ["1e", "Cost or other basis"], ["4", "Federal income tax withheld"]],
};

export function genericFacsimile(kind: DocKind, issuer: string, year: number, seedValues: number[]): Facsimile {
  const rows = KIND_ROWS[kind] ?? [["a", "Amount"]];
  return statementFacsimile({
    title: kind.startsWith("1099") || kind.startsWith("1098") || kind.startsWith("1095") ? `Form ${kind}` : kind,
    issuer,
    year,
    rows: rows.map(([id, label], i) => ({
      id,
      label: `${id}  ${label}`,
      value: money(seedValues[i % seedValues.length]),
    })),
  });
}
