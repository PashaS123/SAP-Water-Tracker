const categoryLabels = {
  shower: "Showers",
  toilet: "Toilets",
  faucet: "Faucets",
  dishes: "Dish washing",
  laundry: "Laundry",
  leaks: "Leaks + habits"
};

const chartColors = {
  shower: "#1f8bd3",
  toilet: "#0f766e",
  faucet: "#e0a227",
  dishes: "#eb7356",
  laundry: "#5aa658",
  leaks: "#7774d6"
};

const form = document.querySelector("#waterSurvey");
const liveDaily = document.querySelector("#liveDaily");
const liveStatus = document.querySelector("#liveStatus");
const liveList = document.querySelector("#liveList");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const resetButton = document.querySelector("#resetButton");
const navCta = document.querySelector(".nav-cta");

const planTitle = document.querySelector("#planTitle");
const planIntro = document.querySelector("#planIntro");
const dailyTotal = document.querySelector("#dailyTotal");
const perPerson = document.querySelector("#perPerson");
const topUse = document.querySelector("#topUse");
const savingsTotal = document.querySelector("#savingsTotal");
const topCategory = document.querySelector("#topCategory");
const barChart = document.querySelector("#barChart");
const recommendationsList = document.querySelector("#recommendationsList");
const recommendationStatus = document.querySelector("#recommendationStatus");
const checklist = document.querySelector("#checklist");

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function formNumber(formData, name) {
  return parseNumber(formData.get(name));
}

function selectedTag(name) {
  const control = form.elements[name];
  if (!control || control.selectedIndex < 0) return "";
  return control.options[control.selectedIndex]?.dataset.tag || "";
}

function formatNumber(value) {
  return Math.round(value).toLocaleString();
}

function requiredControls() {
  return [...form.querySelectorAll("[required]")];
}

function isSurveyComplete() {
  return requiredControls().every((control) => String(control.value).trim() !== "");
}

function updateProgress() {
  const controls = requiredControls();
  const answered = controls.filter((control) => String(control.value).trim() !== "").length;
  const percent = controls.length ? Math.round((answered / controls.length) * 100) : 0;
  progressText.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  return { answered, total: controls.length };
}

function topCategoryKey(estimate) {
  return Object.entries(estimate.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "shower";
}

function getEstimate() {
  if (!isSurveyComplete()) return null;

  const formData = new FormData(form);
  const people = Math.max(1, formNumber(formData, "people") || 1);
  const showerGpm = formNumber(formData, "showerType") || 0;
  const toiletGpf = formNumber(formData, "toiletType") || 0;
  const faucetGpm = formNumber(formData, "faucetType") || 0;
  const dishGallons = formNumber(formData, "dishType") || 0;
  const washerGallons = formNumber(formData, "washerType") || 0;

  const showersPerPerson = formNumber(formData, "showersPerPerson") || 0;
  const showerMinutes = formNumber(formData, "showerMinutes") || 0;
  const flushesPerPerson = formNumber(formData, "flushesPerPerson") || 0;
  const faucetMinutes = formNumber(formData, "faucetMinutes") || 0;
  const faucetHabitExtra = formNumber(formData, "faucetHabits") || 0;
  const dishLoads = formNumber(formData, "dishLoads") || 0;
  const preRinseExtra = formNumber(formData, "preRinse") || 0;
  const laundryLoads = formNumber(formData, "laundryLoads") || 0;
  const laundryHabitExtra = formNumber(formData, "laundryHabits") || 0;
  const leakRisk = formNumber(formData, "leakRisk") || 0;

  const categories = {
    shower: (people * showersPerPerson * showerMinutes * showerGpm) / 7,
    toilet: people * flushesPerPerson * toiletGpf,
    faucet: people * faucetMinutes * faucetGpm + faucetHabitExtra,
    dishes: (dishLoads * (dishGallons + preRinseExtra)) / 7,
    laundry: washerGallons === 0 ? 0 : (laundryLoads * (washerGallons + laundryHabitExtra)) / 7,
    leaks: leakRisk
  };

  const dailyTotal = Object.values(categories).reduce((sum, value) => sum + value, 0);

  return {
    people,
    dailyTotal,
    perPerson: dailyTotal / people,
    categories,
    inputs: {
      showerGpm,
      toiletGpf,
      faucetGpm,
      dishGallons,
      washerGallons,
      showersPerPerson,
      showerMinutes,
      flushesPerPerson,
      faucetMinutes,
      faucetHabitExtra,
      dishLoads,
      preRinseExtra,
      laundryLoads,
      laundryHabitExtra,
      leakRisk,
      habitGoal: formData.get("habitGoal"),
      showerTag: selectedTag("showerType"),
      toiletTag: selectedTag("toiletType"),
      faucetTag: selectedTag("faucetType"),
      dishTag: selectedTag("dishType"),
      washerTag: selectedTag("washerType")
    }
  };
}

function renderInactiveLive() {
  const progress = updateProgress();
  liveDaily.textContent = "--";
  liveStatus.textContent = `Complete the survey to see your estimate. ${progress.answered} of ${progress.total} required questions answered.`;
  liveList.innerHTML = "";
}

function renderLiveEstimate() {
  const estimate = getEstimate();
  if (!estimate) {
    renderInactiveLive();
    return;
  }

  const entries = Object.entries(estimate.categories).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...entries.map(([, value]) => value), 1);

  liveDaily.textContent = formatNumber(estimate.dailyTotal);
  liveStatus.textContent = "estimated gallons per day";
  liveList.innerHTML = entries.map(([key, value]) => {
    const width = value > 0 ? Math.max(3, (value / maxValue) * 100) : 0;
    return `<div class="live-row"><span>${categoryLabels[key]}</span><b>${formatNumber(value)}</b><i style="--width:${width}%; --color:${chartColors[key]}"></i></div>`;
  }).join("");

  updateProgress();
}

function recommendation(estimate, category, title, text, impact, priorityBonus = 0) {
  const top = topCategoryKey(estimate);
  const topBoost = category === top ? 1000000 : 0;
  const leakBoost = category === "leaks" && estimate.inputs.leakRisk > 0 ? 2000000 : 0;

  return {
    category,
    title,
    text,
    impact: Math.max(0, impact || 0),
    priority: Math.max(0, impact || 0) + topBoost + leakBoost + priorityBonus
  };
}

function buildRecommendations(estimate) {
  const i = estimate.inputs;
  const recs = [];

  if (i.leakRisk > 0) {
    recs.push(recommendation(
      estimate,
      "leaks",
      "Check for leaks or running toilets",
      `Your leak answer could represent about ${formatNumber(i.leakRisk * 365)} gallons per year. A toilet dye test is a simple first check.`,
      i.leakRisk * 365
    ));
  }

  if (i.showerMinutes > 5 && i.showersPerPerson > 0) {
    const minutesSaved = Math.min(2, Math.max(1, i.showerMinutes - 5));
    const yearly = estimate.people * i.showersPerPerson * minutesSaved * i.showerGpm * 52;
    recs.push(recommendation(
      estimate,
      "shower",
      `Reduce average shower time by ${minutesSaved} minute${minutesSaved === 1 ? "" : "s"}`,
      `With your shower routine, this could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  }

  if (i.showerGpm > 2.0) {
    const yearly = estimate.people * i.showersPerPerson * i.showerMinutes * (i.showerGpm - 2.0) * 52;
    recs.push(recommendation(
      estimate,
      "shower",
      "Switch to a WaterSense showerhead",
      `A WaterSense showerhead uses about 2.0 gpm or less and could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  }

  if (i.toiletGpf > 1.28) {
    const yearly = estimate.people * i.flushesPerPerson * (i.toiletGpf - 1.28) * 365;
    recs.push(recommendation(
      estimate,
      "toilet",
      "Choose a WaterSense toilet when replacing",
      `A 1.28 gpf WaterSense toilet could save about ${formatNumber(yearly)} gallons per year with your flush estimate.`,
      yearly
    ));
  }

  if (i.faucetGpm > 1.5) {
    const yearly = estimate.people * i.faucetMinutes * (i.faucetGpm - 1.5) * 365;
    recs.push(recommendation(
      estimate,
      "faucet",
      "Use a faucet aerator",
      `A WaterSense faucet or aerator could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  }

  if (i.faucetHabitExtra > 0 || i.habitGoal === "faucets") {
    const yearly = (estimate.people * Math.max(1, i.faucetMinutes * 0.2) * i.faucetGpm * 365) + (i.faucetHabitExtra * 365);
    recs.push(recommendation(
      estimate,
      "faucet",
      "Turn faucets off during pauses",
      `Turning water off while brushing teeth, scrubbing, or rinsing could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  }

  if (i.dishTag === "handwash") {
    const yearly = i.dishLoads * Math.max(4, i.dishGallons - 8) * 52;
    recs.push(recommendation(
      estimate,
      "dishes",
      "Use a basin when hand washing dishes",
      `Avoiding a constantly running tap could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  } else {
    if (i.preRinseExtra > 0) {
      const yearly = i.dishLoads * i.preRinseExtra * 52;
      recs.push(recommendation(
        estimate,
        "dishes",
        "Scrape dishes instead of pre-rinsing",
        `Skipping pre-rinse water could save about ${formatNumber(yearly)} gallons per year.`,
        yearly
      ));
    }

    const yearly = i.dishLoads * 1.5 * 52;
    recs.push(recommendation(
      estimate,
      "dishes",
      "Only run full dishwasher loads",
      `Waiting for full loads avoids extra cycles and could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  }

  if (i.washerTag !== "offsite" && i.washerGallons > 20) {
    const yearly = i.laundryLoads * (i.washerGallons - 20) * 52;
    recs.push(recommendation(
      estimate,
      "laundry",
      "Use high-efficiency washer settings",
      `Moving closer to a 20 gallon high-efficiency load could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  }

  if (i.washerTag !== "offsite" && (i.laundryHabitExtra > 0 || i.habitGoal === "laundry")) {
    const yearly = i.laundryLoads * Math.max(8, i.laundryHabitExtra) * 52;
    recs.push(recommendation(
      estimate,
      "laundry",
      "Only run full laundry loads",
      `Avoiding small loads could save about ${formatNumber(yearly)} gallons per year.`,
      yearly
    ));
  }

  const top = topCategoryKey(estimate);
  recs.push(recommendation(
    estimate,
    top,
    `Track ${categoryLabels[top].toLowerCase()} for one week`,
    `Because ${categoryLabels[top].toLowerCase()} are your biggest category, write down this habit for seven days and look for a pattern.`,
    0,
    500
  ));

  const habitLabels = {
    showers: "shorter showers",
    laundry: "full laundry loads",
    faucets: "turning faucets off",
    dishes: "a better dishwashing routine",
    leaks: "checking for leaks"
  };
  const habitCategories = {
    showers: "shower",
    laundry: "laundry",
    faucets: "faucet",
    dishes: "dishes",
    leaks: "leaks"
  };
  const habitCategory = habitCategories[i.habitGoal] || top;

  recs.push(recommendation(
    estimate,
    habitCategory,
    `Start with ${habitLabels[i.habitGoal]}`,
    `You chose ${habitLabels[i.habitGoal]} as realistic. Make that your first one-week action instead of trying to change everything at once.`,
    0,
    300
  ));

  const unique = [];
  const titles = new Set();

  recs
    .sort((a, b) => b.priority - a.priority)
    .forEach((rec) => {
      if (!titles.has(rec.title) && unique.length < 6) {
        titles.add(rec.title);
        unique.push(rec);
      }
    });

  const fallbackActions = [
    recommendation(
      estimate,
      top,
      "Write down appliance model numbers",
      "Knowing specific model numbers makes future comparisons more accurate and helps you look for WaterSense or ENERGY STAR options.",
      0,
      30
    ),
    recommendation(
      estimate,
      top,
      "Compare this estimate with a real water bill",
      "If your family has a water bill, compare the estimate to actual use and look for differences caused by outdoor water, leaks, or missing habits.",
      0,
      20
    ),
    recommendation(
      estimate,
      top,
      "Share one change with your household",
      "Water savings work better when the people at home know the goal and agree on one habit to try.",
      0,
      10
    )
  ];

  fallbackActions.forEach((rec) => {
    if (!titles.has(rec.title) && unique.length < 4) {
      titles.add(rec.title);
      unique.push(rec);
    }
  });

  return unique.slice(0, 6);
}

function renderPlanPreview() {
  planTitle.textContent = "Plan preview";
  planIntro.textContent = "After you complete the survey, this section will show your biggest water-use category, estimated gallons per day, and ranked ways to reduce your household water use.";
  dailyTotal.textContent = "--";
  perPerson.textContent = "--";
  topUse.textContent = "--";
  savingsTotal.textContent = "--";
  topCategory.textContent = "Complete the survey first";
  recommendationStatus.textContent = "Personalized after submission";
  barChart.classList.add("is-empty");
  barChart.innerHTML = "<p>Your category chart will appear here after the survey.</p>";
  recommendationsList.className = "empty-list";
  recommendationsList.innerHTML = "<li>Complete the survey to get 4-6 recommendations based on your answers.</li>";
  checklist.innerHTML = `
    <label><input type="checkbox" disabled> Complete the survey</label>
    <label><input type="checkbox" disabled> Choose one water-saving action</label>
    <label><input type="checkbox" disabled> Try it for one week</label>
  `;
}

function renderResults(event) {
  event.preventDefault();

  if (!isSurveyComplete()) {
    renderInactiveLive();
    form.reportValidity();
    return;
  }

  const estimate = getEstimate();
  const entries = Object.entries(estimate.categories).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  const recommendations = buildRecommendations(estimate);
  const savings = recommendations.reduce((sum, rec) => sum + rec.impact, 0);
  const perPersonRounded = Math.round(estimate.perPerson);
  const comparisonDifference = Math.abs(perPersonRounded - 82);
  const comparison = perPersonRounded > 82
    ? `${formatNumber(comparisonDifference)} gallons above`
    : perPersonRounded < 82
      ? `${formatNumber(comparisonDifference)} gallons below`
      : "about the same as";

  planTitle.textContent = "Your water-saving plan is ready.";
  planIntro.textContent = `Your household estimate is ${formatNumber(estimate.dailyTotal)} gallons per day. That equals about ${formatNumber(estimate.perPerson)} gallons per person per day, which is ${comparison} the EPA home-use average of 82 gallons per person per day.`;
  dailyTotal.textContent = formatNumber(estimate.dailyTotal);
  perPerson.textContent = formatNumber(estimate.perPerson);
  topUse.textContent = categoryLabels[top[0]];
  savingsTotal.textContent = formatNumber(savings);
  topCategory.textContent = `Biggest category: ${categoryLabels[top[0]]}`;
  recommendationStatus.textContent = "Ranked for your answers";

  const maxValue = Math.max(...entries.map(([, value]) => value), 1);
  barChart.classList.remove("is-empty");
  barChart.innerHTML = entries.map(([key, value]) => {
    const width = value > 0 ? Math.max(3, (value / maxValue) * 100) : 0;
    return `<div class="bar-row"><span>${categoryLabels[key]}</span><div class="bar-track"><span style="--width:${width}%; --color:${chartColors[key]}"></span></div><b>${formatNumber(value)}</b></div>`;
  }).join("");

  recommendationsList.className = "";
  recommendationsList.innerHTML = recommendations.map((rec) => `
    <li><span class="rec-copy"><strong>${rec.title}:</strong> ${rec.text}</span></li>
  `).join("");

  checklist.innerHTML = recommendations.slice(0, 4).map((rec) => `
    <label><input type="checkbox"> ${rec.title}</label>
  `).join("");

  if (navCta) {
    navCta.hidden = true;
  }

  renderLiveEstimate();
  document.querySelector("#plan").scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("input", renderLiveEstimate);
form.addEventListener("change", renderLiveEstimate);
form.addEventListener("submit", renderResults);

resetButton.addEventListener("click", () => {
  form.reset();
  if (navCta) {
    navCta.hidden = false;
  }
  renderInactiveLive();
  renderPlanPreview();
});

renderInactiveLive();
renderPlanPreview();
