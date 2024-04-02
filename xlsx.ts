import fs from "node:fs/promises";
import xlsx from "node-xlsx";

import dump from "./dump.json" assert { type: "json" };

const normalizedDump = dump
  .sort((a, b) => Number(b.semester.value) - Number(b.semester.value))
  .map((demand) => [
    demand.course,
    demand.demand,
    demand.unit.label,
    demand.semester.label,
    demand.period,
    demand.vacancies,
    demand.subscriberCount,
  ]);

const data = [
  ["Curso", "Demanda", "Unidade", "Semestre", "Período", "Vagas", "Inscritos"],
  ...normalizedDump,
];

const buffer = xlsx.build([{ name: "Últimos 5 semestres", data, options: {} }]);

await fs.writeFile("sheet.xlsx", buffer);
