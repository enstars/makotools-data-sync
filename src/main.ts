/* eslint-disable github/array-foreach */
import { writeFileSync, mkdirSync } from "fs";
import * as core from "@actions/core";
import getSheet from "./getSheet";
import axios from "axios";
require("dotenv").config();

const TEST_SHEET_IDS = "1NdrCTFzbeqN-nvlLzy8YbeBbNwPnHruIe95Q1eE4Iyk";
const TEST_REPO = "data";
// const SEARCH_KEY = process.env.SEARCH_KEY;

const unflatten = require("flat").unflatten;

process.on("unhandledRejection", handleError);
main().catch(handleError);

async function main(): Promise<void> {
  try {
    const sheetIDs = (core.getInput("sheet-ids") || TEST_SHEET_IDS)
      .split(",")
      .map(s => s.trim());
    core.info(`Fetching Google Sheets from IDs: ${sheetIDs.join(", ")}`);

    const repo = core.getInput("repo").split("/")[1] || TEST_REPO;
    core.info(`Checking for sheets for repository: ${repo}`);

    let sheetsData = [];
    for (let i = 0; i < sheetIDs.length; i++) {
      const sheetID = sheetIDs[i];
      const data = await getSheet(sheetID);
      sheetsData = [...sheetsData, ...data];
    }

    sheetsData = sheetsData.filter((s: any) => s.name.split("/")[0] === repo);
    core.info(`Found ${sheetsData?.length} entries`);

    const sourcePath = process.env.GITHUB_WORKSPACE;
    sheetsData.forEach((s: any) => {
      const sheetPath = `${sourcePath}/${s.name
        .replace(`${repo}/`, "")
        .replace(".json", "")}`;
      const sheetDir = sheetPath
        .split("/")
        .slice(0, -1)
        .join("/");

      core.info(` ├ Writing ${sheetPath}`);

      mkdirSync(sheetDir, { recursive: true });
      writeFileSync(
        `${sheetPath}.max.json`,
        `${JSON.stringify(s.data, undefined, 2)}\n`
      );
      writeFileSync(`${sheetPath}.json`, `${JSON.stringify(s.data)}\n`);

      if (s.config.search) {
        core.info(` │ └ Adding to MeiliSearch`);
        const dataRepo = s.name.split("/")[0].replace(".json", "");
        const dataLocale = s.name.split("/")[1].replace(".json", "");
        const dataType = s.name.split("/")[2].replace(".json", "");
        const { key, params, localizedParams } = s.config.search;

        const updateData = s.data
          .map(item => {
            const unflatItem = unflatten(item);
            const result = {};
            params.forEach(param => {
              result[param] = unflatItem?.[param];
            });
            localizedParams.forEach(param => {
              result[`${dataLocale}__${param}`] = unflatItem?.[param];
            });
            return result;
          })
          .filter(p => p[key]);
        axios.put(
          `https://oceans.ensemble.moe/indexes/${dataType}/documents?primaryKey=${key}`,
          updateData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${
                // SEARCH_KEY
                core.getInput("search_key") || process.env.SEARCH_KEY
              }`
            }
          }
        );
        const updateDataCombined = s.data
          .map(item => {
            const unflatItem = unflatten(item);
            const result = {
              type: dataType,
              unique_id: `${dataType}__${unflatItem?.[key]}`
            };
            params.forEach(param => {
              if (param !== key) result[param] = unflatItem?.[param];
            });
            localizedParams.forEach(param => {
              if (param !== key)
                result[`${dataRepo}__${dataLocale}__${param}`] =
                  unflatItem?.[param];
            });
            return result;
          })
          .filter(p => p.unique_id);
        axios.put(
          `https://oceans.ensemble.moe/indexes/all/documents?primaryKey=unique_id`,
          updateDataCombined,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${core.getInput("search_key") ||
                process.env.SEARCH_KEY}`
            }
          }
        );
      }
    });

    core.info(` └ Done! 🎉`);
  } catch (error) {
    handleError(error);
  }
}

function handleError(err: any): void {
  console.error(err);
  core.setFailed(`Unhandled error: ${err}`);
}
