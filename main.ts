import fs from "node:fs/promises";
import * as cheerio from "cheerio";

const defaultHeaders = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "max-age=0",
  "content-type": "application/x-www-form-urlencoded",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const semestersHtml = await fetch(
  "https://www.vestibulinhoetec.com.br/demanda/",
  {
    headers: {
      ...defaultHeaders,
      Referer: "https://www.vestibulinhoetec.com.br/",
    },
  }
).then((response) => response.text());

const $semestersPage = cheerio.load(semestersHtml);

const semesters = $semestersPage("[name=ano-sem] option")
  .toArray()
  .map((e) => ({ value: e.attribs.value, label: $semestersPage(e).text() }))
  .filter((semester) => semester.value)
  // Take few semesters for speed
  .slice(0, 5);

const unitsBySemester: Record<string, { label: string; value: string }[]> = {};

for (const semester of semesters) {
  console.log("Carregando o semestre " + semester.label);

  const unitsHtml = await fetch(
    "https://www.vestibulinhoetec.com.br/demanda/demanda.asp",
    {
      headers: {
        ...defaultHeaders,
        Referer: "https://www.vestibulinhoetec.com.br/demanda/",
      },
      body: "ano-sem=" + semester.value,
      method: "POST",
    }
  ).then((response) => response.text());

  const $unitsPage = cheerio.load(unitsHtml);

  const units = $unitsPage("#CodEtec option")
    .toArray()
    .map((e) => ({ value: e.attribs.value, label: $unitsPage(e).text() }))
    .filter((unit) => unit.value);

  unitsBySemester[semester.value] = units;
}

const foundDemands: {
  semester: { label: string; value: string };
  unit: { label: string; value: string };
  course: string;
  period: string;
  subscriberCount: string;
  vacancies: string;
  demand: string;
}[] = [];

for (const [semester, units] of Object.entries(unitsBySemester)) {
  for (const unit of units) {
    const demandsHtml = await fetch(
      "https://www.vestibulinhoetec.com.br/demanda/demanda.asp",
      {
        headers: {
          ...defaultHeaders,
          Referer: "https://www.vestibulinhoetec.com.br/demanda/demanda.asp",
        },
        body:
          "ano-sem=" +
          semester +
          "&CodEtec=" +
          unit.value +
          "&V_REQCodEtec=Selecione a Etec/Extensão de Etec",
        method: "POST",
      }
    ).then((response) => response.text());

    const $demandsPage = cheerio.load(demandsHtml);

    const parsedDemands = $demandsPage("table tbody tr:has(td)")
      .toArray()
      .map((row) => {
        const [course, period, subscriberCount, vacancies, demand] =
          $demandsPage(row)
            .find("td")
            .toArray()
            .map((cell) => $demandsPage(cell).text());

        return {
          course,
          period,
          subscriberCount,
          vacancies,
          demand,
        };
      });

    parsedDemands.forEach((parsedDemand) =>
      foundDemands.push({
        semester: semesters.find(({ value }) => value === semester)!,
        unit,
        ...parsedDemand,
      })
    );

    await fs.writeFile("dump.json", JSON.stringify(foundDemands, null, 2));
  }
}
