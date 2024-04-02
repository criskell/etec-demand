import fs from "node:fs/promises";

import dump from "./dump.json" assert { type: "json" };

const sql =
  "INSERT INTO demands (course, demand, unit, semester, period, vacancies, subscriberCount) VALUES " +
  dump
    .sort((a, b) => Number(b.semester.value) - Number(a.semester.value))
    .map(
      (demand) =>
        "(" +
        [
          demand.course,
          demand.demand.replace(",", "."),
          demand.unit.label.replace("'", "\\'"),
          demand.semester.value,
          demand.period,
          Number(demand.vacancies),
          Number(demand.subscriberCount),
        ]
          .map((value) => `'${value}'`)
          .join(",") +
        ")"
    )
    .join(",");

await fs.writeFile("sheet.sql", sql);
