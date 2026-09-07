import { demoSellerInput } from "../lib/witness/demo-input.js";
import { runTrial } from "../lib/witness/trial.js";

async function main() {
  for (const id of ["plainword", "omnibrain", "northstar"] as const) {
    const result = await runTrial(demoSellerInput(id));
    console.log(id, result.docket.grade, result.docket.verdicts.map((verdict) => verdict.status).join(","));
  }
}

void main();
