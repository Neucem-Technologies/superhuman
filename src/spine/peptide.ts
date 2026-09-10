export type PeptideInput = {
  powderMg: number;
  vialVolumeMl: number;
  syringeVolumeMl: number;
  syringeUnits: number;
  targetDoseMcg: number;
  premixedConcentrationMcgPerMl?: number;
};

export type PeptideResult = {
  concentrationMcgPerMl: number;
  doseMl: number;
  unitsToDraw: number;
  totalDoses: number;
  leftoverDoses: number;
};

export function calcPeptide(input: PeptideInput, dosesTaken = 0): PeptideResult {
  const powderMcg = Math.max(0, input.powderMg) * 1000;
  const vol = Math.max(0.01, input.vialVolumeMl);
  const concentration =
    input.premixedConcentrationMcgPerMl && input.premixedConcentrationMcgPerMl > 0
      ? input.premixedConcentrationMcgPerMl
      : powderMcg / vol;
  const dose = Math.max(1, input.targetDoseMcg);
  const doseMl = dose / Math.max(1, concentration);
  const unitsPerMl = input.syringeUnits / Math.max(0.01, input.syringeVolumeMl);
  const unitsToDraw = doseMl * unitsPerMl;
  const totalDoses = Math.floor(powderMcg / dose);
  const leftoverDoses = Math.max(0, totalDoses - dosesTaken);
  return {
    concentrationMcgPerMl: concentration,
    doseMl,
    unitsToDraw,
    totalDoses,
    leftoverDoses,
  };
}

export function peptideSummary(r: PeptideResult) {
  return `${Math.round(r.concentrationMcgPerMl)} mcg/ml · draw ${r.unitsToDraw.toFixed(1)} units · ${r.leftoverDoses} doses left`;
}
