// Search quantities per shop offer. Bounds relax the remaining demand and
// each shop budget separately, so a pruned branch cannot improve the plan.
function solve({items, coins}) {
  const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const left = coins.map(c => c.balance);
  const bought = items.map(() => coins.map(() => 0));
  let best = bought.map(row => row.slice()), saved = 0, visits = 0;
  const offers = [];
  const demand = items.map(it => it.qty);
  for (const [i, it] of items.entries()) {
    for (const [j, cost] of it.costs.entries()) {
      if (it.price && it.qty && cost > 0 && cost <= left[j])
        offers.push({i, j, cost, price: it.price});
    }
  }
  // Explore efficient purchases first. Keep the ratio ordering exact even
  // when comparing cross-products larger than a safe JavaScript integer.
  offers.sort((a,b) => {
    const diff = BigInt(b.price)*BigInt(a.cost) - BigInt(a.price)*BigInt(b.cost);
    return diff > 0n ? 1 : diff < 0n ? -1 : 0;
  });

  function bound(start) {
    const budget = left.slice(), covered = new Map();
    let fractional = 0;
    for (let k = start; k < offers.length; k++) {
      const {i,j,cost,price} = offers[k];
      const whole = Math.min(demand[i], Math.floor(budget[j]/cost));
      fractional += whole * price;
      budget[j] -= whole * cost;
      if (whole < demand[i] && budget[j]) {
        fractional += Math.ceil(budget[j] / cost * price) + 1;
        budget[j] = 0;
      }
    }
    // Independent affordability must use the original available budget,
    // since fractional packing may already have spent a shop's balance.
    for (let k = start; k < offers.length; k++) {
      const {i,j,cost} = offers[k];
      covered.set(i, Math.min(demand[i], (covered.get(i)||0) + Math.floor(left[j]/cost)));
    }
    let value = 0;
    for (const [i,n] of covered) value += n * items[i].price;
    return Math.min(value, fractional);
  }

  function search(k, value) {
    if (++visits > 2000000) throw Error('This plan exceeds the browser search limit. Reduce quantities or offers to calculate an exact plan.');
    if (value > saved) {
      saved = value;
      best = bought.map(row => row.slice());
    }
    const ceiling = value + bound(k);
    if (ceiling <= saved) return;
    const {i,j,cost,price} = offers[k];
    const max = Math.min(demand[i], Math.floor(left[j]/cost));
    for (let n = max; n >= 0; n--) {
      demand[i] -= n;
      left[j] -= n * cost;
      bought[i][j] = n;
      search(k+1, value+n*price);
      demand[i] += n;
      left[j] += n * cost;
      bought[i][j] = 0;
      if (saved >= ceiling) break;
    }
  }
  search(0,0);
  const used = coins.map((_,j) => best.reduce((sum,row,i) => sum + row[j]*items[i].costs[j],0));
  return {bought:best, used, saved, total};
}
if (typeof module !== 'undefined') module.exports = solve;
