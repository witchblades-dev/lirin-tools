// Shared material counts for the Upgrade Cost table and coin-shop planner.
function recipeTotals(item, steps, attempts = () => 1, adjustment = () => 0) {
  const counts = {}, quantities = {};
  let yang = 0;
  for (const step of steps) {
    const row = item.steps[step];
    const times = attempts(step);
    yang += row[0] * times;
    for (let i = 1; i < row.length; i += 2) {
      const id = row[i];
      counts[id] = (counts[id] || 0) + row[i + 1] * times;
    }
  }
  for (const id of Object.keys(counts)) {
    quantities[id] = Math.max(0, counts[id] + adjustment(id));
  }
  return {c: counts, q: quantities, yang};
}
