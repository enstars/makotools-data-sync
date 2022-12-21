import axios from "axios";
import * as core from "@actions/core";

const unflatten = require("flat").unflatten;

export default async function getSheet<T>(sheetId = ""): Promise<T[] | []> {
  if (!sheetId) throw new Error("Need a Google sheet id to load");

  try {
    const resultsJson = await (
      await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&key=AIzaSyACADWLTjCH0zpxiXCOLgMJJh3CxflBac4`
      )
    ).data;
    return resultsJson.sheets.map(sheet => {
      let sheetConfig = {};
      try {
        sheetConfig = JSON.parse(sheet.data[0].rowData[0].values[0].note);
      } catch (e) {
        // core.info("no config found!");
      }

      const sheetName = sheet.properties.title;
      const sheetData = sheet.data[0].rowData.slice(
        sheet.properties.gridProperties.frozenRowCount - 1
      );
      const header = sheetData[0].values.map(v => v?.formattedValue);

      const sheetUnflattened = sheetData
        .slice(1)
        .map(row => {
          if (!row?.values || row.values.length === 0)
            return { __skipRow: true };
          const dataRow = row?.values?.map(v => v?.formattedValue);
          const obj = {};
          header.forEach((h, i) => {
            const data = dataRow[i];

            // only make the field actually null if data is __null;
            // else, just remove the field entirely to reduce json size
            if (h !== "__skipColumn" && typeof dataRow !== "undefined") {
              if (data === "__null") {
                obj[h] = null;
              } else if (data !== "null") {
                try {
                  obj[h] = JSON.parse(dataRow[i]);
                } catch {
                  // strings are just put in directly
                  obj[h] = dataRow[i];
                }
              }
            }
          });

          return unflatten(JSON.parse(JSON.stringify(obj)));
        })
        .filter(row => row.__skipRow !== true)
        .filter(d => d.compliant === "TRUE");
      return { data: sheetUnflattened, name: sheetName, config: sheetConfig };
    });
  } catch (error) {
    throw error;
  }
}
