function updateServiceModel(model, durationSec) {
  const alpha = 0.2;
  if (!model || typeof model.avg !== "number") {
    return { avg: durationSec, var: 0 };
  }
  const diff = durationSec - model.avg;
  const newAvg = model.avg + alpha * diff;
  const newVar = (1 - alpha) * (model.var + alpha * diff * diff);
  return { avg: newAvg, var: newVar };
}

function etaSeconds({ model, aheadCount }) {
  const avg = (model && model.avg) ? model.avg : 11 * 60;
  const variance = (model && typeof model.var === "number") ? model.var : (4 * 60) ** 2;

  const mean = aheadCount * avg;
  const std = Math.sqrt(Math.max(0, aheadCount) * Math.max(0, variance));

  const low = Math.max(0, Math.round(mean - 1.28 * std));
  const high = Math.max(0, Math.round(mean + 1.28 * std));

  return { mean: Math.round(mean), low, high, avgServiceSec: Math.round(avg) };
}

module.exports = { updateServiceModel, etaSeconds };
