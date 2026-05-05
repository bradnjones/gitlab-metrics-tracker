import { readFile } from 'fs/promises';

/**
 * @typedef {Object} Sprint
 * @property {string} iterationId
 * @property {string} iterationTitle
 * @property {string} startDate
 * @property {string} dueDate
 * @property {number} completedPoints
 * @property {number} completedStories
 * @property {number} cycleTimeAvg
 * @property {number} cycleTimeP50
 * @property {number} cycleTimeP90
 * @property {number} deploymentFrequency
 * @property {number} leadTimeAvg
 * @property {number} leadTimeP50
 * @property {number} leadTimeP90
 * @property {number} mttrAvg
 * @property {number} changeFailureRate
 */

const NUMERIC_FIELDS = [
  'completedPoints', 'completedStories', 'cycleTimeAvg', 'cycleTimeP50', 'cycleTimeP90',
  'deploymentFrequency', 'leadTimeAvg', 'leadTimeP50', 'leadTimeP90', 'mttrAvg', 'changeFailureRate',
];

/**
 * @param {string} csvString
 * @returns {Sprint[]}
 */
export function parseCSV(csvString) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = csvString.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).reduce((acc, line) => {
    const values = line.split(",").map(v => v.trim());
    if (values.length !== headers.length) return acc;

    const sprint = {};
    headers.forEach((header, i) => {
      if (NUMERIC_FIELDS.includes(header)) {
        sprint[header] = values[i] === "" ? 0 : parseFloat(values[i]);
      } else {
        sprint[header] = values[i];
      }
    });

    if (sprint.completedPoints === 0 && sprint.completedStories === 0 && sprint.deploymentFrequency === 0) {
      return acc;
    }

    if (sprint.dueDate > today) {
      return acc;
    }

    acc.push(sprint);
    return acc;
  }, []);
}

/**
 * @param {string} filePath - absolute path to CSV file
 * @returns {Promise<Sprint[]>}
 */
export async function parseCSVFile(filePath) {
  const content = await readFile(filePath, "utf-8");
  return parseCSV(content);
}
